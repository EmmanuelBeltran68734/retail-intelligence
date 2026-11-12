"""Pronóstico para el tablero (ruta GET /indicadores/pronostico).

Usa la función de Bianca (`pronostico.pronosticar`, Holt-Winters semanal) sin modificarla y le agrega:
- el error del modelo y el del método base, medidos con las ventas del propio comercio;
- un rango bajo–alto para cada semana pronosticada.
"""
import warnings
from datetime import date, timedelta

import pandas as pd

from app.servicios.pronostico import pronosticar

SEMANAS_PRUEBA = 4  # semanas que se apartan para medir el error
MINIMO_SEMANAS = 8 + SEMANAS_PRUEBA
CONFIANZA_ALTA = 15.0   # MAPE (%) del método elegido
CONFIANZA_MEDIA = 25.0  # el modelo necesita 8 semanas (dos ciclos de 4) más las de prueba


def ultima_semana_completa(ultima_venta: date) -> date:
    """Las semanas terminan el lunes (como en pronosticar). Se descarta la última semana si está a medias."""
    return ultima_venta - timedelta(days=ultima_venta.weekday())


def _semanal(df: pd.DataFrame) -> pd.Series:
    return df.set_index(pd.to_datetime(df["fecha"]))["importe"].resample("W-MON").sum()


def _modelo(df: pd.DataFrame, semanas: int) -> list[tuple[str, float]]:
    """Llama a la función de Bianca con una sola serie y devuelve (semana_fin, valor)."""
    entrada = pd.DataFrame({
        "fecha": df["fecha"].astype(str),
        "categoria": "serie",
        "cantidad": 1,
        "precio_unitario": df["importe"],
        "descuento": 0,
    })
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")  # avisos de convergencia de statsmodels
        resultado = pronosticar(entrada, semanas)
    total = resultado[resultado["categoria"] == "TOTAL"]
    return list(zip(total["semana_fin"], total["ventas_pronosticadas"]))


def _pesos(valor: float) -> str:
    return "$" + f"{valor:,.0f}".replace(",", ".")


def _mape(errores: list[float], reales: list[float]) -> float | None:
    pares = [(e, r) for e, r in zip(errores, reales) if r > 0]
    return round(100 * sum(e / r for e, r in pares) / len(pares), 1) if pares else None


def _evaluar(df: pd.DataFrame, serie: pd.Series) -> dict:
    """Aparta las últimas 4 semanas, pronostica con lo anterior y compara con lo que de verdad se vendió.
    Método base: repetir el promedio de las 4 semanas anteriores a la prueba."""
    corte = serie.index[-SEMANAS_PRUEBA - 1]
    entreno = df[pd.to_datetime(df["fecha"]) <= corte]
    reales = [float(v) for v in serie.iloc[-SEMANAS_PRUEBA:]]
    modelo = [v for _, v in _modelo(entreno, SEMANAS_PRUEBA)]
    base = float(serie.iloc[-2 * SEMANAS_PRUEBA:-SEMANAS_PRUEBA].mean())
    err_modelo = [abs(m - r) for m, r in zip(modelo, reales)]
    err_base = [abs(base - r) for r in reales]
    return {
        "semanas_evaluadas": SEMANAS_PRUEBA,
        "mae_modelo": round(sum(err_modelo) / SEMANAS_PRUEBA, 2),
        "mae_base": round(sum(err_base) / SEMANAS_PRUEBA, 2),
        "mape_modelo": _mape(err_modelo, reales),
        "mape_base": _mape(err_base, reales),
    }


def _serie(df: pd.DataFrame, nombre: str, id_categoria: int | None, semanas: int) -> dict:
    serie = _semanal(df)
    if len(serie) < MINIMO_SEMANAS:
        return {"omitida": True, "categoria": nombre, "id_categoria": id_categoria, "semanas_con_historia": len(serie)}
    error = _evaluar(df, serie)
    # O4 · Regla de elección: se usa el método que menos se equivocó (MAE) en las últimas 4 semanas;
    # si empatan, el más sencillo (el promedio). El rango es ± el error de ese método.
    mejor = "modelo" if error["mae_modelo"] < error["mae_base"] else "base"
    if mejor == "modelo":
        valores = _modelo(df, semanas)
        margen, mape = error["mae_modelo"], error["mape_modelo"]
        modelo_nombre = "Holt-Winters"
        frase = (f"Usamos Holt-Winters porque en las últimas {SEMANAS_PRUEBA} semanas se equivocó en promedio "
                 f"{_pesos(error['mae_modelo'])} por semana, menos que repetir el promedio reciente "
                 f"({_pesos(error['mae_base'])}).")
    else:
        promedio = round(float(serie.iloc[-SEMANAS_PRUEBA:].mean()), 2)
        ultima = serie.index[-1]
        valores = [((ultima + pd.Timedelta(weeks=i + 1)).strftime("%Y-%m-%d"), promedio) for i in range(semanas)]
        margen, mape = error["mae_base"], error["mape_base"]
        modelo_nombre = f"Promedio de las últimas {SEMANAS_PRUEBA} semanas"
        frase = (f"Usamos el promedio de las últimas {SEMANAS_PRUEBA} semanas porque se equivocó menos "
                 f"({_pesos(error['mae_base'])} por semana) que Holt-Winters ({_pesos(error['mae_modelo'])}).")
    confianza = _confianza(mape)
    if confianza == "baja":
        frase += " Estas ventas cambian mucho de una semana a otra: tómalo solo como una idea."
    puntos = [
        {"semana_inicio": (pd.Timestamp(semana) - pd.Timedelta(days=6)).strftime("%Y-%m-%d"), "semana_fin": semana,
         "valor": valor, "bajo": round(max(0.0, valor - margen), 2), "alto": round(valor + margen, 2)}
        for semana, valor in valores
    ]
    return {"categoria": nombre, "id_categoria": id_categoria, "modelo": "holt_winters" if mejor == "modelo" else "promedio",
            "modelo_nombre": modelo_nombre, "confianza": confianza, "pronostico": puntos,
            "error": error, "mejor": mejor, "frase": frase}


def _confianza(mape: float | None) -> str:
    """Alta si el error del método elegido es de 15 % o menos; media hasta 25 % (la meta del proyecto); baja si es mayor."""
    if mape is None or mape > CONFIANZA_MEDIA:
        return "baja"
    return "alta" if mape <= CONFIANZA_ALTA else "media"


def calcular(df: pd.DataFrame, semanas: int, incluir_total: bool, hasta: date | None = None) -> dict:
    """df: una fila por producto vendido con fecha, id_categoria, categoria e importe.
    Solo se usan semanas completas: todo lo posterior a `hasta` se descarta. Si no se envía `hasta`,
    se toma el último lunes desde la venta más reciente (la semana a medias no entra)."""
    if not df.empty:
        if hasta is None:
            hasta = ultima_semana_completa(max(df["fecha"]))
        df = df[df["fecha"] <= hasta]
    grupos = []
    if incluir_total:
        grupos.append(("Total del comercio", None, df))
    for (id_categoria, nombre), grupo in df.groupby(["id_categoria", "categoria"]):
        grupos.append((str(nombre), int(id_categoria), grupo))

    series, omitidas = [], []
    for nombre, id_categoria, grupo in grupos:
        resultado = _serie(grupo, nombre, id_categoria, semanas)
        if resultado.pop("omitida", False):
            omitidas.append(resultado)
        else:
            series.append(resultado)
    respuesta = {"series": series, "omitidas": omitidas}
    if not series:
        respuesta["mensaje"] = (f"Para pronosticar se necesitan al menos {MINIMO_SEMANAS} semanas completas de ventas. "
                                "Sigue cargando tus ventas y vuelve a intentarlo.")
    return respuesta
