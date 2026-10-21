"""La plantilla de ventas del Anexo B (tabla 5) y la lectura de archivos CSV/Excel."""
import io
import unicodedata

import pandas as pd

OBLIGATORIAS = ["fecha", "id_ticket", "codigo_producto", "nombre_producto", "categoria", "cantidad", "precio_unitario"]
OPCIONALES = ["descuento", "id_cliente", "medio_pago"]
COLUMNAS = OBLIGATORIAS + OPCIONALES
MEDIOS_PAGO = ["efectivo", "tarjeta", "transferencia", "credito"]

EJEMPLO = [
    {"fecha": "2026-09-14", "id_ticket": "F-00231", "codigo_producto": "ARZ-500", "nombre_producto": "Arroz Diana 500 g",
     "categoria": "Granos", "cantidad": 2, "precio_unitario": 3200, "descuento": 0, "id_cliente": "C-014", "medio_pago": "efectivo"},
    {"fecha": "2026-09-14", "id_ticket": "F-00231", "codigo_producto": "LEC-1L", "nombre_producto": "Leche entera 1 L",
     "categoria": "Lácteos", "cantidad": 1, "precio_unitario": 4500, "descuento": 0, "id_cliente": "C-014", "medio_pago": "efectivo"},
    {"fecha": "2026-09-14", "id_ticket": "F-00232", "codigo_producto": "PAN-TAJ", "nombre_producto": "Pan tajado",
     "categoria": "Panadería", "cantidad": 1, "precio_unitario": 6800, "descuento": 500, "id_cliente": "", "medio_pago": "transferencia"},
]

TAMANO_MAXIMO = 5 * 1024 * 1024  # 5 MB


def plantilla(formato: str) -> tuple[bytes, str, str]:
    """Devuelve (contenido, tipo MIME, nombre de archivo) de la plantilla con 3 filas de ejemplo (HU-03)."""
    df = pd.DataFrame(EJEMPLO, columns=COLUMNAS)
    if formato == "xlsx":
        salida = io.BytesIO()
        df.to_excel(salida, index=False, sheet_name="ventas")
        return (salida.getvalue(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "plantilla_ventas.xlsx")
    # utf-8 con BOM para que Excel en Windows muestre bien las tildes.
    return df.to_csv(index=False).encode("utf-8-sig"), "text/csv; charset=utf-8", "plantilla_ventas.csv"


def normalizar_encabezado(texto: str) -> str:
    """«Código producto» -> «codigo_producto»: sin tildes, en minúscula y con guion bajo."""
    sin_tildes = unicodedata.normalize("NFKD", str(texto)).encode("ascii", "ignore").decode()
    return "_".join(sin_tildes.strip().lower().split())


class ArchivoIlegible(Exception):
    pass


def leer_archivo(nombre: str, contenido: bytes) -> pd.DataFrame:
    """Lee CSV (coma o punto y coma, UTF-8 o Windows) o Excel .xlsx. Todo se lee como texto."""
    extension = nombre.rsplit(".", 1)[-1].lower() if "." in nombre else ""
    try:
        if extension == "csv":
            for codificacion in ("utf-8-sig", "cp1252", "latin-1"):
                try:
                    texto = contenido.decode(codificacion)
                    break
                except UnicodeDecodeError:
                    continue
            df = pd.read_csv(io.StringIO(texto), sep=None, engine="python", dtype=str, keep_default_na=False)
        elif extension == "xlsx":
            df = pd.read_excel(io.BytesIO(contenido), dtype=str, keep_default_na=False)
        else:
            raise ArchivoIlegible("formato")
    except ArchivoIlegible:
        raise
    except Exception as error:  # noqa: BLE001
        raise ArchivoIlegible(str(error)) from error
    df.columns = [normalizar_encabezado(c) for c in df.columns]
    return df
