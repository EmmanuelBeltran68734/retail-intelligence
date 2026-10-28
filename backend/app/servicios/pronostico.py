
"""Pronóstico semanal de ventas de Retail Intelligence."""

import pandas as pd
from statsmodels.tsa.holtwinters import ExponentialSmoothing


def pronosticar(df: pd.DataFrame, semanas: int = 4) -> pd.DataFrame:
    """
    Pronosticamos las próximas semanas de ventas por categoría
    y para el comercio completo mediante Holt-Winters.

    Recibimos las ventas en el formato de nuestra plantilla CSV
    y devolvemos una tabla con los valores pronosticados.
    """
    if semanas < 1:
        raise ValueError("El número de semanas debe ser mayor que cero.")

    columnas = {
        "fecha", "categoria", "cantidad", "precio_unitario"
    }
    faltantes = columnas - set(df.columns)

    if faltantes:
        raise ValueError(
            f"Faltan columnas necesarias: {sorted(faltantes)}"
        )

    if df.empty:
        raise ValueError("No hay ventas para realizar el pronóstico.")

    # Preparamos los datos sin modificar el DataFrame original.
    datos = df.copy()
    datos["fecha"] = pd.to_datetime(datos["fecha"], errors="coerce")
    datos["cantidad"] = pd.to_numeric(
        datos["cantidad"], errors="coerce"
    )
    datos["precio_unitario"] = pd.to_numeric(
        datos["precio_unitario"], errors="coerce"
    )

    if "descuento" in datos.columns:
        datos["descuento"] = pd.to_numeric(
            datos["descuento"], errors="coerce"
        ).fillna(0)
    else:
        datos["descuento"] = 0

    if datos[["fecha", "cantidad", "precio_unitario"]].isna().any().any():
        raise ValueError("Hay fechas o valores de venta incorrectos.")

    # Calculamos el importe de cada registro.
    datos["importe"] = (
        datos["cantidad"] * datos["precio_unitario"]
        - datos["descuento"]
    )

    resultados = []

    # Pronosticamos el total y cada categoría por separado.
    grupos = [("TOTAL", datos)]
    grupos.extend(
        (str(categoria), grupo)
        for categoria, grupo in datos.groupby("categoria")
    )

    for categoria, grupo in grupos:

        # Agrupamos las ventas en semanas que finalizan el lunes.
        # Esto permitirá separar abril-agosto de septiembre
        # sin mezclar datos de ambos períodos en una misma semana.
        serie = (
            grupo.set_index("fecha")["importe"]
            .resample("W-MON")
            .sum()
        )

        # Necesitamos por lo menos dos ciclos de cuatro semanas.
        if len(serie) < 8:
            raise ValueError(
                f"No hay suficientes semanas para {categoria}."
            )

        # Entrenamos Holt-Winters con tendencia y un ciclo
        # estacional de cuatro semanas.
        modelo = ExponentialSmoothing(
            serie,
            trend="add",
            seasonal="add",
            seasonal_periods=4,
            initialization_method="estimated",
        )

        ajuste = modelo.fit(optimized=True)
        predicciones = ajuste.forecast(semanas)

        # Evitamos pronósticos monetarios negativos.
        for fecha, valor in predicciones.items():
            resultados.append({
                "categoria": categoria,
                "semana_fin": fecha.strftime("%Y-%m-%d"),
                "ventas_pronosticadas": round(
                    max(0.0, float(valor)), 2
                ),
            })

    return pd.DataFrame(resultados)
