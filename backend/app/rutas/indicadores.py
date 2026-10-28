"""RF-05, RF-06, RF-07 · HU-07 y HU-08: indicadores y ABC, siempre filtrados por el comercio del token."""
from datetime import date, timedelta
from typing import Literal

import pandas as pd
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import obtener_sesion
from app.dependencias import usuario_actual
from app.errores import ErrorApi
from app.modelos import Categoria, Cliente, DetalleVenta, Producto, Usuario, Venta
from app.servicios import indicadores

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
    return {"sin_datos": False, **indicadores.resumen(df, df_ant, desde, hasta, desde_ant, hasta_ant)}


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
