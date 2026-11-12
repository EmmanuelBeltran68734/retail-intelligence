"""RF-05, RF-06, RF-07 · HU-07 y HU-08: indicadores y ABC, siempre filtrados por el comercio del token."""
from datetime import date, timedelta
from typing import Literal

import pandas as pd
from fastapi import APIRouter, Depends, Query
from fastapi.encoders import jsonable_encoder
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import obtener_sesion
from app.dependencias import usuario_actual
from app.errores import ErrorApi
from app.modelos import Categoria, Cliente, DetalleVenta, EjecucionModelo, Inventario, Producto, Usuario, Venta, VersionModelo
from app.servicios import agotamientos, indicadores, pronostico_tablero, trazabilidad

router = APIRouter(prefix="/api/indicadores", tags=["indicadores"])

COLUMNAS = ["fecha", "id_venta", "id_producto", "codigo", "producto", "id_categoria", "categoria", "id_cliente", "cliente", "importe"]


def _ventas(sesion: Session, id_comercio, desde: date, hasta: date,
            categoria_id: int | None, cliente_id: int | None) -> pd.DataFrame:
    """Una fila por producto vendido. El filtro por comercio va SIEMPRE: así un comercio no ve los datos de otro."""
    importe = DetalleVenta.cantidad * DetalleVenta.precio_unitario - DetalleVenta.descuento
    consulta = (
        select(Venta.fecha, Venta.id_venta, Producto.id_producto, Producto.codigo, Producto.nombre, Categoria.id_categoria,
               Categoria.nombre, Venta.id_cliente, Cliente.codigo_seudonimo, importe)
        .join(DetalleVenta, DetalleVenta.id_venta == Venta.id_venta)
        .join(Producto, Producto.id_producto == DetalleVenta.id_producto)
        .join(Categoria, Categoria.id_categoria == Producto.id_categoria)
        .outerjoin(Cliente, Cliente.id_cliente == Venta.id_cliente)
        .where(Venta.id_comercio == id_comercio, Venta.fecha >= desde, Venta.fecha <= hasta)
    )
    if categoria_id is not None:
        consulta = consulta.where(Producto.id_categoria == categoria_id)
    if cliente_id is not None:
        consulta = consulta.where(Venta.id_cliente == cliente_id)
    df = pd.DataFrame(sesion.execute(consulta).all(), columns=COLUMNAS)
    if not df.empty:
        df["importe"] = df["importe"].astype(float)
    return df


def _periodo(sesion: Session, id_comercio, desde: date | None, hasta: date | None):
    """Si no se envían fechas: los últimos 30 días con ventas. Devuelve None si el comercio no tiene ventas."""
    if desde and hasta and desde > hasta:
        raise ErrorApi(400, "periodo_invalido", "La fecha «desde» no puede ser posterior a «hasta».")
    ultima = sesion.scalar(select(func.max(Venta.fecha)).where(Venta.id_comercio == id_comercio))
    if ultima is None:
        return None  # el comercio todavía no tiene ventas: sin_datos
    if hasta is None:
        hasta = max(ultima, desde) if desde else ultima
    if desde is None:
        desde = hasta - timedelta(days=29)
    return desde, hasta


def _rango_datos(sesion: Session, id_comercio):
    """Primera y última venta cargada del comercio."""
    return sesion.execute(
        select(func.min(Venta.fecha), func.max(Venta.fecha)).where(Venta.id_comercio == id_comercio)
    ).one()


def _control_clientes(usuario: Usuario, cliente_id: int | None, agrupar: str | None = None):
    """El encargado no ve clientes (HU-02)."""
    if (cliente_id is not None or agrupar == "cliente") and usuario.rol.nombre != "propietario":
        raise ErrorApi(403, "sin_permiso", "Solo el propietario del comercio puede ver la información de clientes.")


@router.get("/resumen", summary="Tarjetas del inicio y del tablero (HU-07)")
def resumen(
    desde: date | None = None,
    hasta: date | None = None,
    categoria_id: int | None = None,
    cliente_id: int | None = None,
    usuario: Usuario = Depends(usuario_actual),
    sesion: Session = Depends(obtener_sesion),
):
    _control_clientes(usuario, cliente_id)
    periodo = _periodo(sesion, usuario.id_comercio, desde, hasta)
    if periodo is None:
        return {"sin_datos": True}
    desde, hasta = periodo
    dias = (hasta - desde).days + 1
    if indicadores.es_mes_completo(desde, hasta):
        hasta_ant = desde - timedelta(days=1)
        desde_ant = hasta_ant.replace(day=1)
    else:
        hasta_ant = desde - timedelta(days=1)
        desde_ant = hasta_ant - timedelta(days=dias - 1)
    df = _ventas(sesion, usuario.id_comercio, desde, hasta, categoria_id, cliente_id)
    df_ant = _ventas(sesion, usuario.id_comercio, desde_ant, hasta_ant, categoria_id, cliente_id)
    primera, ultima = _rango_datos(sesion, usuario.id_comercio)
    return {"sin_datos": False, **indicadores.resumen(df, df_ant, desde, hasta, desde_ant, hasta_ant,
                                                       datos_desde=primera, datos_hasta=ultima)}


@router.get("/ventas", summary="Series para los gráficos (RF-05)")
def ventas(
    agrupar: Literal["dia", "semana", "mes", "dia_semana", "categoria", "producto", "cliente"] = "semana",
    desde: date | None = None,
    hasta: date | None = None,
    categoria_id: int | None = None,
    cliente_id: int | None = None,
    limite: int = Query(10, ge=1, le=100),
    usuario: Usuario = Depends(usuario_actual),
    sesion: Session = Depends(obtener_sesion),
):
    _control_clientes(usuario, cliente_id, agrupar)
    periodo = _periodo(sesion, usuario.id_comercio, desde, hasta)
    if periodo is None:
        return {"sin_datos": True, "agrupar": agrupar, "puntos": []}
    desde, hasta = periodo
    df = _ventas(sesion, usuario.id_comercio, desde, hasta, categoria_id, cliente_id)
    return {"sin_datos": False, "agrupar": agrupar, "periodo": {"desde": desde, "hasta": hasta},
            "puntos": indicadores.serie(df, agrupar, desde, hasta, limite)}


@router.get("/abc", summary="Productos clave: clasificación ABC (HU-08)")
def clasificacion_abc(
    desde: date | None = None,
    hasta: date | None = None,
    categoria_id: int | None = None,
    cliente_id: int | None = None,
    usuario: Usuario = Depends(usuario_actual),
    sesion: Session = Depends(obtener_sesion),
):
    """Grupos A, B y C con el porcentaje acumulado de ventas y un consejo por grupo (P07)."""
    _control_clientes(usuario, cliente_id)
    periodo = _periodo(sesion, usuario.id_comercio, desde, hasta)
    if periodo is None:
        return {"sin_datos": True}
    desde, hasta = periodo
    df = _ventas(sesion, usuario.id_comercio, desde, hasta, categoria_id, cliente_id)
    return {"sin_datos": False, "periodo": {"desde": desde, "hasta": hasta}, **indicadores.abc(df)}


def _version_modelo(sesion: Session) -> VersionModelo:
    version = sesion.scalar(select(VersionModelo).where(
        VersionModelo.nombre == trazabilidad.NOMBRE, VersionModelo.version == trazabilidad.VERSION))
    if version is None:
        version = VersionModelo(nombre=trazabilidad.NOMBRE, version=trazabilidad.VERSION,
                                parametros=trazabilidad.PARAMETROS)
        sesion.add(version)
        sesion.flush()
    return version


def _ficha(ejecucion: EjecucionModelo, version: VersionModelo, reutilizada: bool) -> dict:
    return {
        "numero": ejecucion.id_ejecucion,
        "version_modelo": f"{version.nombre} {version.version}",
        "parametros": version.parametros,
        "huella_datos": ejecucion.huella_datos,
        "cargas_de_origen": len(ejecucion.cargas),
        "creada_en": ejecucion.creado_en,
        "reutilizada": reutilizada,
    }


def _respuesta(ejecucion: EjecucionModelo, version: VersionModelo, reutilizada: bool) -> dict:
    """Formato de la tarjeta de P02: id_ejecucion y version_modelo arriba, y la ficha completa en `ejecucion`."""
    return {
        **ejecucion.resultado,
        "id_ejecucion": ejecucion.id_ejecucion,
        "version_modelo": {"nombre": version.nombre, "version": version.version},
        "mensaje": ejecucion.resultado.get("mensaje"),
        "ejecucion": _ficha(ejecucion, version, reutilizada=reutilizada),
    }


@router.get("/pronostico", summary="Pronóstico de ventas de las próximas semanas (Holt-Winters)")
def pronostico_ventas(
    semanas: int = Query(4, ge=1, le=8),
    categoria_id: int | None = None,
    usuario: Usuario = Depends(usuario_actual),
    sesion: Session = Depends(obtener_sesion),
):
    """Total del comercio y cada categoría: valor pronosticado por semana con rango bajo–alto,
    y el error del modelo frente al método base (promedio de las 4 semanas anteriores).

    Cada respuesta trae su `ejecucion` (O3): número, versión y parámetros del modelo, y la huella de los datos.
    Si los datos y la versión no cambiaron, se devuelve la misma ejecución en vez de calcular otra."""
    primera, ultima = _rango_datos(sesion, usuario.id_comercio)
    if ultima is None:
        return {"sin_datos": True}
    hasta = pronostico_tablero.ultima_semana_completa(ultima)
    df = _ventas(sesion, usuario.id_comercio, primera, hasta, categoria_id, None)
    version = _version_modelo(sesion)
    huella = trazabilidad.huella_datos(df, semanas, categoria_id)

    ejecucion = sesion.scalar(select(EjecucionModelo).where(
        EjecucionModelo.id_comercio == usuario.id_comercio, EjecucionModelo.id_version == version.id_version,
        EjecucionModelo.huella_datos == huella))
    if ejecucion is not None:
        sesion.commit()
        return _respuesta(ejecucion, version, reutilizada=True)

    resultado = jsonable_encoder({
        "sin_datos": False,
        "modelo": "Holt-Winters (ciclo de 4 semanas)",
        "historia": {"desde": primera, "hasta": hasta},
        "semanas": semanas,
        **pronostico_tablero.calcular(df, semanas, incluir_total=categoria_id is None, hasta=hasta),
    })
    cargas = sorted(str(c) for c in sesion.scalars(select(Venta.id_carga).distinct().where(
        Venta.id_comercio == usuario.id_comercio, Venta.fecha >= primera, Venta.fecha <= hasta)))
    ejecucion = EjecucionModelo(
        id_comercio=usuario.id_comercio, id_version=version.id_version, huella_datos=huella,
        desde=primera, hasta=hasta, semanas=semanas, id_categoria=categoria_id, cargas=cargas,
        metricas=trazabilidad.metricas(resultado), resultado=resultado)
    sesion.add(ejecucion)
    sesion.commit()
    sesion.refresh(ejecucion)
    return _respuesta(ejecucion, version, reutilizada=False)


@router.get("/agotamientos", summary="Productos que dejaron de venderse: confirmado, posible o con existencias (O2)")
def productos_agotados(
    hasta: date | None = None,
    usuario: Usuario = Depends(usuario_actual),
    sesion: Session = Depends(obtener_sesion),
):
    """Nunca dice «se agotó» sin un conteo de existencias en cero. Sin conteo, el resultado es «posible»
    (confianza baja); si el conteo muestra unidades, «con_existencias»."""
    _, ultima = _rango_datos(sesion, usuario.id_comercio)
    if ultima is None:
        return {"sin_datos": True}
    hasta = min(hasta, ultima) if hasta else ultima
    desde = hasta - timedelta(days=agotamientos.VENTANA_DIAS - 1)
    ventas_df = _ventas(sesion, usuario.id_comercio, desde, hasta, None, None)
    conteos = pd.DataFrame(sesion.execute(
        select(Inventario.fecha, Inventario.id_producto, Inventario.existencias)
        .where(Inventario.id_comercio == usuario.id_comercio, Inventario.fecha <= hasta)
    ).all(), columns=["fecha", "id_producto", "existencias"])
    productos = agotamientos.detectar(ventas_df, conteos, hasta)
    return {
        "sin_datos": False,
        "periodo": {"desde": desde, "hasta": hasta},
        "regla": agotamientos.REGLA,
        "resumen": {t: sum(1 for p in productos if p["tipo"] == t) for t in ("confirmado", "posible", "con_existencias")},
        "productos": productos,
    }
