"""O2 · Conteos de existencias: plantilla, carga con errores por fila e historial.
Los conteos sirven para confirmar (o descartar) un agotamiento; nunca se infiere solo de que no hubo ventas."""
from datetime import date

import pandas as pd
from fastapi import APIRouter, Depends, File, Response, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import obtener_sesion
from app.dependencias import usuario_actual
from app.errores import ErrorApi
from app.modelos import Inventario, Producto, Usuario
from app.servicios.plantilla import TAMANO_MAXIMO, ArchivoIlegible, leer_archivo

router = APIRouter(prefix="/api/inventario", tags=["inventario"])

COLUMNAS = ["fecha", "codigo_producto", "existencias"]
EJEMPLO = [["2026-09-30", "ARZ-500", "12"], ["2026-09-30", "LEC-1L", "0"]]


@router.get("/plantilla", summary="Plantilla de conteo de existencias")
def plantilla_inventario():
    contenido = pd.DataFrame(EJEMPLO, columns=COLUMNAS).to_csv(index=False).encode("utf-8-sig")
    return Response(content=contenido, media_type="text/csv; charset=utf-8",
                    headers={"Content-Disposition": 'attachment; filename="plantilla_inventario.csv"'})


@router.post("", summary="Subir un conteo de existencias")
async def subir_conteo(
    archivo: UploadFile = File(...),
    usuario: Usuario = Depends(usuario_actual),
    sesion: Session = Depends(obtener_sesion),
):
    """Guarda las filas correctas y devuelve los errores por fila. Si ya había un conteo del mismo producto
    en la misma fecha, se reemplaza por el nuevo."""
    nombre = archivo.filename or "archivo"
    contenido = await archivo.read()
    if len(contenido) > TAMANO_MAXIMO:
        raise ErrorApi(422, "archivo_muy_grande", "El archivo pesa más de 5 MB.")
    if not nombre.lower().endswith((".csv", ".xlsx")):
        raise ErrorApi(422, "formato_no_soportado", "Solo se pueden subir archivos .csv o .xlsx.")
    try:
        df = leer_archivo(nombre, contenido)
    except ArchivoIlegible:
        raise ErrorApi(422, "archivo_ilegible", "No pudimos leer el archivo. Revisa que esté basado en la plantilla.")
    faltan = [c for c in COLUMNAS if c not in df.columns]
    if faltan:
        raise ErrorApi(422, "columnas_faltantes",
                       f"Al archivo le faltan columnas: {', '.join(faltan)}. Descarga la plantilla de inventario.",
                       faltan=faltan)

    productos = {p.codigo: p for p in sesion.scalars(select(Producto).where(Producto.id_comercio == usuario.id_comercio))}
    errores, validas = [], {}
    for i, fila in df.iterrows():
        n = i + 2  # la fila 1 es el encabezado
        texto_fecha, codigo, texto_exist = (str(fila[c]).strip() for c in COLUMNAS)
        if not (texto_fecha or codigo or texto_exist):
            continue
        try:
            fecha = date.fromisoformat(texto_fecha)
        except ValueError:
            errores.append({"fila": n, "columna": "fecha", "valor": texto_fecha,
                            "mensaje": f"Fila {n}: «{texto_fecha}» no es una fecha válida.",
                            "sugerencia": "Escríbala como AAAA-MM-DD."})
            continue
        producto = productos.get(codigo)
        if producto is None:
            errores.append({"fila": n, "columna": "codigo_producto", "valor": codigo,
                            "mensaje": f"Fila {n}: el producto «{codigo}» no está en tu catálogo.",
                            "sugerencia": "Usa el mismo código con el que aparece en tus ventas."})
            continue
        try:
            existencias = float(texto_exist.replace(",", "."))
        except ValueError:
            existencias = None
        if existencias is None or existencias < 0:
            errores.append({"fila": n, "columna": "existencias", "valor": texto_exist,
                            "mensaje": f"Fila {n}: «existencias» debe ser un número igual o mayor que cero.",
                            "sugerencia": "Escribe cuántas unidades contaste; si no hay, escribe 0."})
            continue
        validas[(producto.id_producto, fecha)] = existencias  # si se repite en el archivo, gana la última

    nuevos = actualizados = 0
    for (id_producto, fecha), existencias in validas.items():
        conteo = sesion.scalar(select(Inventario).where(Inventario.id_producto == id_producto, Inventario.fecha == fecha))
        if conteo is None:
            sesion.add(Inventario(id_comercio=usuario.id_comercio, id_producto=id_producto, fecha=fecha,
                                  existencias=existencias))
            nuevos += 1
        else:
            conteo.existencias = existencias
            actualizados += 1
    sesion.commit()
    return {"nombre_archivo": nombre, "conteos_guardados": nuevos, "conteos_actualizados": actualizados,
            "filas_con_error": len(errores), "errores": errores}


@router.get("", summary="Conteos de existencias guardados")
def conteos(usuario: Usuario = Depends(usuario_actual), sesion: Session = Depends(obtener_sesion)):
    filas = sesion.execute(
        select(Inventario, Producto).join(Producto, Producto.id_producto == Inventario.id_producto)
        .where(Inventario.id_comercio == usuario.id_comercio).order_by(Inventario.fecha.desc(), Producto.codigo))
    return [{"fecha": c.fecha, "codigo": p.codigo, "producto": p.nombre, "existencias": c.existencias}
            for c, p in filas]
