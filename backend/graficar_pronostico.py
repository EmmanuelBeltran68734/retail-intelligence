
"""Gráfica comparativa del pronóstico de ventas de Retail Intelligence."""

from pathlib import Path

import matplotlib.pyplot as plt
import pandas as pd
from matplotlib.ticker import FuncFormatter


# Localizamos los resultados obtenidos durante la evaluación.
RAIZ = Path(__file__).resolve().parent.parent
CARPETA = RAIZ / "docs" / "evaluacion_pronostico"

archivo = CARPETA / "comparacion_semanal.csv"

# Utilizamos los resultados reales, sin volver a calcular predicciones.
datos = pd.read_csv(archivo)

# Comparamos las ventas totales del comercio.
total = (
    datos[datos["categoria"] == "TOTAL"]
    .sort_values("semana_fin")
    .copy()
)

if len(total) != 4:
    raise ValueError("Esperábamos cuatro semanas de evaluación.")

semanas = pd.to_datetime(total["semana_fin"]).dt.strftime("%d/%m")

# Construimos la gráfica comparativa.
fig, ax = plt.subplots(figsize=(10, 5.5))

ax.plot(
    semanas,
    total["ventas_reales"],
    marker="o",
    linewidth=2.5,
    label="Ventas reales",
)

ax.plot(
    semanas,
    total["Holt_Winters"],
    marker="s",
    linewidth=2,
    linestyle="--",
    label="Holt-Winters",
)

ax.plot(
    semanas,
    total["Metodo_base"],
    marker="^",
    linewidth=2,
    linestyle=":",
    label="Promedio últimas 4 semanas",
)

ax.set_title(
    "Retail Intelligence: evaluación del pronóstico\n"
    "Ventas totales - septiembre de 2026",
    fontsize=14,
    fontweight="bold",
)

ax.set_xlabel("Semana que finaliza en")
ax.set_ylabel("Ventas semanales (COP)")

# Mostramos el eje vertical en millones de pesos.
ax.yaxis.set_major_formatter(
    FuncFormatter(lambda valor, _: f"${valor / 1_000_000:.1f} M")
)

ax.legend()
ax.grid(axis="y", alpha=0.25)

fig.tight_layout()

# Guardamos la imagen para incluirla en el informe.
salida = CARPETA / "grafica_septiembre_total.png"
fig.savefig(salida, dpi=200, bbox_inches="tight")

plt.close(fig)

print("Gráfica creada correctamente:")
print(salida)
