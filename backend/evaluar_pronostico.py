
"""Evaluamos los pronósticos de Retail Intelligence."""

from pathlib import Path

import numpy as np
import pandas as pd

from app.servicios.pronostico import pronosticar


# Localizamos el archivo de ventas y la carpeta de resultados.
RAIZ = Path(__file__).resolve().parent.parent
ARCHIVO = RAIZ / "datos" / "ventas_prueba.csv"
SALIDA = RAIZ / "docs" / "evaluacion_pronostico"

SALIDA.mkdir(parents=True, exist_ok=True)

# Cargamos las ventas y calculamos el importe de cada registro.
datos = pd.read_csv(ARCHIVO)
datos["fecha"] = pd.to_datetime(datos["fecha"])

datos["importe"] = (
    datos["cantidad"] * datos["precio_unitario"]
    - datos["descuento"].fillna(0)
)

# Entrenamos con abril-agosto y evaluamos septiembre.
entrenamiento = datos[datos["fecha"] <= "2026-08-31"].copy()

prueba = datos[
    (datos["fecha"] >= "2026-09-01")
    & (datos["fecha"] <= "2026-09-28")
].copy()

# Consideramos cuatro semanas completas, de martes a lunes.
semanas = pd.date_range(
    start="2026-09-07",
    periods=4,
    freq="W-MON",
)

pronosticos = pronosticar(entrenamiento, semanas=4)
pronosticos["semana_fin"] = pd.to_datetime(
    pronosticos["semana_fin"]
)


def calcular_metricas(reales, estimados):
    """Calculamos MAE y MAPE de las predicciones."""
    reales = np.asarray(reales, dtype=float)
    estimados = np.asarray(estimados, dtype=float)

    diferencias = np.abs(reales - estimados)
    mae = float(np.mean(diferencias))

    # MAPE no está definido cuando una venta real es cero.
    if np.any(reales == 0):
        mape = float("nan")
    else:
        mape = float(np.mean(diferencias / reales) * 100)

    return round(mae, 2), round(mape, 2)


def ventas_semanales(df):
    """Agrupamos los importes por semanas que terminan el lunes."""
    return (
        df.set_index("fecha")["importe"]
        .resample("W-MON")
        .sum()
    )


resultados = []
detalles = []

categorias = ["TOTAL"] + sorted(
    entrenamiento["categoria"].dropna().unique()
)

for categoria in categorias:

    if categoria == "TOTAL":
        historico = entrenamiento
        evaluacion = prueba
    else:
        historico = entrenamiento[
            entrenamiento["categoria"] == categoria
        ]
        evaluacion = prueba[
            prueba["categoria"] == categoria
        ]

    # Obtenemos las ventas reales de septiembre.
    reales = (
        ventas_semanales(evaluacion)
        .reindex(semanas, fill_value=0)
    )

    # Recuperamos lo pronosticado por Holt-Winters.
    predicciones = (
        pronosticos[pronosticos["categoria"] == categoria]
        .set_index("semana_fin")["ventas_pronosticadas"]
        .reindex(semanas)
    )

    if predicciones.isna().any():
        raise ValueError(
            f"Faltan predicciones para {categoria}"
        )

    # El método base repite el promedio de las últimas 4 semanas.
    promedio_base = (
        ventas_semanales(historico)
        .tail(4)
        .mean()
    )

    estimacion_base = np.full(4, promedio_base)

    mae_hw, mape_hw = calcular_metricas(
        reales, predicciones
    )
    mae_base, mape_base = calcular_metricas(
        reales, estimacion_base
    )

    resultados.append({
        "categoria": categoria,
        "MAE_Holt_Winters": mae_hw,
        "MAPE_Holt_Winters": mape_hw,
        "MAE_Base": mae_base,
        "MAPE_Base": mape_base,
        "mejor_segun_MAE": (
            "Holt-Winters"
            if mae_hw < mae_base
            else "Metodo base"
            if mae_base < mae_hw
            else "Empate"
        ),
    })

    # Guardamos también los valores semanales para la gráfica.
    for fecha in semanas:
        detalles.append({
            "categoria": categoria,
            "semana_fin": fecha.strftime("%Y-%m-%d"),
            "ventas_reales": float(reales.loc[fecha]),
            "Holt_Winters": float(predicciones.loc[fecha]),
            "Metodo_base": float(promedio_base),
        })


tabla = pd.DataFrame(resultados)
detalle = pd.DataFrame(detalles)

tabla.to_csv(
    SALIDA / "metricas_pronostico.csv",
    index=False,
    encoding="utf-8-sig",
)

detalle.to_csv(
    SALIDA / "comparacion_semanal.csv",
    index=False,
    encoding="utf-8-sig",
)

print("\nEVALUACIÓN DEL MODELO DE PRONÓSTICO")
print("Entrenamiento: abril-agosto de 2026")
print("Evaluación: 1 al 28 de septiembre de 2026")
print()
print(tabla.to_string(index=False))
print()
print("Archivos de resultados guardados en:")
print(SALIDA)
