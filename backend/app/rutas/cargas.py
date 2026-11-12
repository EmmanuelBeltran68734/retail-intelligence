"""RF-02, RF-03, RF-04 · HU-03 a HU-06: plantilla, subir archivo, revisar errores y confirmar."""
import hashlib
import uuid
from collections import OrderedDict
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, File, Query, Response, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import obtener_sesion
from app.dependencias import usuario_actual
from app.errores import ErrorApi
from app.esquemas import Aviso, CargaConfirmada, CargaDetalle, CargaResumen, CatalogoNuevo, ErrorFila, Periodo, ProductoNuevo
from app.modelos import Carga, Categoria, Cliente, DetalleVenta, ErrorCarga, Producto, Usuario, Venta
from app.servicios.plantilla import COLUMNAS, OBLIGATORIAS, TAMANO_MAXIMO, ArchivoIlegible, leer_archivo, plantilla
from app.servicios.validacion import validar

router = APIRouter(prefix="/api/cargas", tags=["carga de ventas"])


# --- Ayudas -----------------------------------------------------------------

def _resumen(c: Carga) -> dict:
    return dict(
        id=c.id_carga, nombre_archivo=c.nombre_archivo, estado=c.estado, creada_en=c.fecha_carga,
        filas_totales=c.filas_total, filas_validas=c.filas_validas, filas_con_error=c.filas_con_error,
        columnas_ignoradas=c.columnas_ignoradas or [],
        periodo=Periodo(desde=c.periodo_desde, hasta=c.periodo_hasta),
    )


def _fecha_texto(d: date) -> str:
    return d.strftime("%d/%m/%Y")


def _avisos(sesion: Session, c: Carga) -> list[Aviso]:
    """Mientras la carga espera confirmación: avisa qué tickets ya estaban guardados y si las fechas se cruzan
    con ventas que ya existen (O5). No impide guardar: los tickets repetidos se descartan al confirmar."""
    if not c.filas_pendientes or c.periodo_desde is None:
        return []
    del_archivo = {(f["id_ticket"], f["fecha"]) for f in c.filas_pendientes}
    guardadas = {(t, f.isoformat()) for t, f in sesion.execute(
        select(Venta.id_ticket, Venta.fecha).where(
            Venta.id_comercio == c.id_comercio, Venta.fecha >= c.periodo_desde, Venta.fecha <= c.periodo_hasta))}
    avisos = []
    repetidos = len(del_archivo & guardadas)
    if repetidos:
        avisos.append(Aviso(
            tipo="tickets_existentes", cantidad=repetidos,
            mensaje=(f"{repetidos} de los {len(del_archivo)} tickets de este archivo ya estaban guardados. "
                     "No se van a sumar otra vez.")))
    otras = len(guardadas - del_archivo)
    if otras:
        avisos.append(Aviso(
            tipo="fechas_cruzadas", cantidad=otras,
            mensaje=(f"Ya tienes {otras} ventas guardadas entre el {_fecha_texto(c.periodo_desde)} y el "
                     f"{_fecha_texto(c.periodo_hasta)} con otros números de ticket. Si este archivo repite esos días, "
                     "las ventas se contarían dos veces.")))
    return avisos


def _detalle(sesion: Session, c: Carga) -> CargaDetalle:
    errores = [ErrorFila(fila=e.fila, columna=e.campo, valor=e.valor, mensaje=e.mensaje, sugerencia=e.sugerencia)
               for e in c.errores]
    return CargaDetalle(**_resumen(c), errores=errores, advertencias=_avisos(sesion, c))


def _carga_del_comercio(sesion: Session, id_carga: uuid.UUID, usuario: Usuario) -> Carga:
    carga = sesion.get(Carga, id_carga)
    if carga is None or carga.id_comercio != usuario.id_comercio:
        raise ErrorApi(404, "no_encontrada", "No encontramos esa carga en tu comercio.")
    return carga


# --- Rutas ------------------------------------------------------------------

@router.get("/plantilla", summary="Descargar la plantilla (HU-03)")
def descargar_plantilla(formato: str = Query("csv", pattern="^(csv|xlsx)$")):
    """Plantilla del Anexo B con tres filas de ejemplo. No necesita sesión (la usa la guía P13)."""
    contenido, tipo, nombre = plantilla(formato)
    return Response(content=contenido, media_type=tipo,
                    headers={"Content-Disposition": f'attachment; filename="{nombre}"'})


@router.post("", status_code=status.HTTP_201_CREATED, response_model=CargaDetalle, summary="Subir y revisar un archivo")
async def subir(
    archivo: UploadFile = File(...),
    usuario: Usuario = Depends(usuario_actual),
    sesion: Session = Depends(obtener_sesion),
):
    """Revisa el archivo y guarda el resultado como `recibida` o `con_errores`. Todavía no guarda ventas."""
    nombre = archivo.filename or "archivo"
    contenido = await archivo.read()
    if len(contenido) > TAMANO_MAXIMO:
        raise ErrorApi(422, "archivo_muy_grande", "El archivo pesa más de 5 MB. Divide las ventas en varios archivos.")
    if not nombre.lower().endswith((".csv", ".xlsx")):
        raise ErrorApi(422, "formato_no_soportado",
                       "Solo se pueden subir archivos .csv o .xlsx. Si es un .xls, guárdalo como .xlsx desde Excel.")
    try:
        df = leer_archivo(nombre, contenido)
    except ArchivoIlegible:
        raise ErrorApi(422, "archivo_ilegible", "No pudimos leer el archivo. Revisa que esté basado en la plantilla.")

    # O5: el mismo archivo (mismo contenido, aunque tenga otro nombre) no se acepta dos veces,
    # salvo que la carga anterior se haya descartado.
    huella = hashlib.sha256(contenido).hexdigest()
    anterior = sesion.scalar(
        select(Carga).where(Carga.id_comercio == usuario.id_comercio, Carga.huella == huella,
                            Carga.estado != "rechazada").order_by(Carga.fecha_carga.desc()))
    if anterior is not None:
        raise ErrorApi(409, "archivo_duplicado",
                       f"Este archivo ya lo subiste el {_fecha_texto(anterior.fecha_carga.date())} "
                       f"(«{anterior.nombre_archivo}»). Ábrelo desde el historial de cargas en vez de subirlo otra vez.",
                       carga_id=str(anterior.id_carga), estado_anterior=anterior.estado)

    carga = Carga(id_comercio=usuario.id_comercio, id_usuario=usuario.id_usuario, nombre_archivo=nombre,
                  estado="recibida", filas_total=len(df), huella=huella)
    faltan = [c for c in OBLIGATORIAS if c not in df.columns]
    if faltan:
        carga.estado = "rechazada"
        sesion.add(carga)
        sesion.commit()
        raise ErrorApi(422, "columnas_faltantes",
                       f"Al archivo le faltan columnas obligatorias: {', '.join(faltan)}. Descarga la plantilla y compáralas.",
                       faltan=faltan, id=str(carga.id_carga))

    resultado = validar(df)
    validas, errores = resultado["filas_validas"], resultado["errores"]
    fechas = [v["fecha"] for v in validas]
    carga.columnas_ignoradas = [c for c in df.columns if c not in COLUMNAS]
    carga.filas_validas = len(validas)
    carga.filas_con_error = len({e["fila"] for e in errores})
    carga.filas_total = carga.filas_validas + carga.filas_con_error  # sin contar filas vacías
    carga.periodo_desde = date.fromisoformat(min(fechas)) if fechas else None
    carga.periodo_hasta = date.fromisoformat(max(fechas)) if fechas else None
    carga.filas_pendientes = validas
    carga.estado = "con_errores" if errores else "recibida"
    carga.errores = [ErrorCarga(fila=e["fila"], campo=e["campo"], tipo_error=e["tipo_error"], valor=e["valor"],
                                mensaje=e["mensaje"], sugerencia=e["sugerencia"]) for e in errores]
    sesion.add(carga)
    sesion.commit()
    sesion.refresh(carga)
    return _detalle(sesion, carga)


@router.get("", response_model=list[CargaResumen], summary="Historial de cargas")
def historial(usuario: Usuario = Depends(usuario_actual), sesion: Session = Depends(obtener_sesion)):
    cargas = sesion.scalars(
        select(Carga).where(Carga.id_comercio == usuario.id_comercio).order_by(Carga.fecha_carga.desc())
    )
    return [CargaResumen(**_resumen(c)) for c in cargas]


@router.get("/{id_carga}", response_model=CargaDetalle, summary="Detalle de una carga con sus errores")
def detalle(id_carga: uuid.UUID, usuario: Usuario = Depends(usuario_actual), sesion: Session = Depends(obtener_sesion)):
    return _detalle(sesion, _carga_del_comercio(sesion, id_carga, usuario))


@router.post("/{id_carga}/confirmar", response_model=CargaConfirmada, summary="Guardar las filas buenas (HU-06)")
def confirmar(id_carga: uuid.UUID, usuario: Usuario = Depends(usuario_actual), sesion: Session = Depends(obtener_sesion)):
    carga = _carga_del_comercio(sesion, id_carga, usuario)
    if carga.estado == "validada":
        raise ErrorApi(409, "carga_ya_validada", "Esta carga ya se guardó.")
    if carga.estado == "rechazada":
        raise ErrorApi(409, "carga_rechazada", "Esta carga fue descartada. Sube el archivo otra vez.")
    filas = carga.filas_pendientes or []
    if not filas:
        raise ErrorApi(400, "sin_filas_validas", "El archivo no tiene filas correctas para guardar. Corrige los errores y súbelo de nuevo.")

    comercio = usuario.id_comercio
    categorias = {c.nombre.lower(): c for c in sesion.scalars(select(Categoria).where(Categoria.id_comercio == comercio))}
    productos = {p.codigo: p for p in sesion.scalars(select(Producto).where(Producto.id_comercio == comercio))}
    clientes = {c.codigo_seudonimo: c for c in sesion.scalars(select(Cliente).where(Cliente.id_comercio == comercio))}
    nuevas_categorias, nuevos_productos, nuevos_clientes = [], [], 0

    # Agrupar las filas por ticket (id_ticket + fecha), conservando el orden del archivo.
    tickets: OrderedDict[tuple, list[dict]] = OrderedDict()
    for f in filas:
        tickets.setdefault((f["id_ticket"], f["fecha"]), []).append(f)

    guardadas, descartadas, total, fechas = 0, carga.filas_con_error, 0.0, []
    for (id_ticket, fecha_txt), filas_ticket in tickets.items():
        fecha = date.fromisoformat(fecha_txt)
        existe = sesion.scalar(select(Venta.id_venta).where(
            Venta.id_comercio == comercio, Venta.id_ticket == id_ticket, Venta.fecha == fecha))
        if existe:
            descartadas += len(filas_ticket)  # ese ticket ya se había cargado antes
            continue

        cliente = None
        codigo_cliente = next((f["id_cliente"] for f in filas_ticket if f["id_cliente"]), None)
        if codigo_cliente:
            cliente = clientes.get(codigo_cliente)
            if cliente is None:
                cliente = clientes[codigo_cliente] = Cliente(id_comercio=comercio, codigo_seudonimo=codigo_cliente)
                sesion.add(cliente)
                nuevos_clientes += 1

        venta = Venta(id_comercio=comercio, id_carga=carga.id_carga, id_ticket=id_ticket, fecha=fecha,
                      medio_pago=next((f["medio_pago"] for f in filas_ticket if f["medio_pago"]), None), )
        if cliente is not None:
            sesion.flush()
            venta.id_cliente = cliente.id_cliente
        for f in filas_ticket:
            categoria = categorias.get(f["categoria"].lower())
            if categoria is None:
                categoria = categorias[f["categoria"].lower()] = Categoria(id_comercio=comercio, nombre=f["categoria"])
                sesion.add(categoria)
                nuevas_categorias.append(f["categoria"])
            producto = productos.get(f["codigo_producto"])
            if producto is None:
                sesion.flush()
                producto = productos[f["codigo_producto"]] = Producto(
                    id_comercio=comercio, codigo=f["codigo_producto"], nombre=f["nombre_producto"],
                    id_categoria=categoria.id_categoria)
                sesion.add(producto)
                nuevos_productos.append(ProductoNuevo(codigo=producto.codigo, nombre=producto.nombre, categoria=categoria.nombre))
            sesion.flush()
            venta.detalles.append(DetalleVenta(id_producto=producto.id_producto, cantidad=f["cantidad"],
                                               precio_unitario=f["precio_unitario"], descuento=f["descuento"]))
            total += f["cantidad"] * f["precio_unitario"] - f["descuento"]
            guardadas += 1
        fechas.append(fecha)
        sesion.add(venta)

    carga.estado = "validada"
    carga.filas_pendientes = None
    carga.confirmada_en = datetime.now(timezone.utc)
    sesion.commit()

    return CargaConfirmada(
        id=carga.id_carga, estado=carga.estado, ventas_guardadas=guardadas, filas_descartadas=descartadas,
        periodo=Periodo(desde=min(fechas) if fechas else None, hasta=max(fechas) if fechas else None),
        total_vendido=round(total, 2),
        catalogo_nuevo=CatalogoNuevo(productos=nuevos_productos, categorias=nuevas_categorias, clientes=nuevos_clientes),
    )


@router.delete("/{id_carga}", status_code=status.HTTP_204_NO_CONTENT, summary="Descartar una carga")
def descartar(id_carga: uuid.UUID, usuario: Usuario = Depends(usuario_actual), sesion: Session = Depends(obtener_sesion)):
    carga = _carga_del_comercio(sesion, id_carga, usuario)
    if carga.estado == "validada":
        raise ErrorApi(409, "carga_ya_validada", "Esta carga ya se guardó y no se puede descartar.")
    carga.estado = "rechazada"
    carga.filas_pendientes = None
    sesion.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
