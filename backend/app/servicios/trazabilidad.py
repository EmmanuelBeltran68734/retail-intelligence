"""Trazabilidad del pronóstico (O3): cada resultado queda asociado a una versión del modelo, a los datos
exactos que usó (huella) y a un número de ejecución que se puede volver a consultar."""
import hashlib
import json

import pandas as pd

from app.servicios import pronostico_tablero

NOMBRE = "holt_winters_semanal"
VERSION = "1.0"
PARAMETROS = {
    "modelo": "Holt-Winters (statsmodels ExponentialSmoothing)",
    "tendencia": "add",
    "estacionalidad": "add",
    "periodos_estacionales": 4,
    "semanas_terminan": "lunes (W-MON)",
    "solo_semanas_completas": True,
    "semanas_prueba": pronostico_tablero.SEMANAS_PRUEBA,
    "minimo_semanas": pronostico_tablero.MINIMO_SEMANAS,
    "metodo_base": "promedio de las 4 semanas anteriores a la prueba",
    "rango": "valor ± MAE del modelo",
}


def huella_datos(df: pd.DataFrame, semanas: int, id_categoria: int | None) -> str:
    """SHA-256 de las ventas semanales por categoría que entran al modelo, más lo que se pidió.
    Si no cambia ninguna venta usada, la huella es la misma; si se carga una semana nueva, cambia."""
    if df.empty:
        series = {}
    else:
        datos = df.assign(fecha=pd.to_datetime(df["fecha"]))
        series = {
            str(int(cat)): {f.strftime("%Y-%m-%d"): round(float(v), 2)
                            for f, v in grupo.set_index("fecha")["importe"].resample("W-MON").sum().items()}
            for cat, grupo in datos.groupby("id_categoria")
        }
    contenido = {"series": series, "semanas": semanas, "id_categoria": id_categoria,
                 "modelo": NOMBRE, "version": VERSION}
    return hashlib.sha256(json.dumps(contenido, sort_keys=True).encode()).hexdigest()


def metricas(resultado: dict) -> list[dict]:
    return [{"categoria": s["categoria"], "id_categoria": s["id_categoria"], **s["error"], "mejor": s["mejor"]}
            for s in resultado.get("series", [])]
