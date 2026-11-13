
"""Análisis de productos comprados juntos mediante soporte, confianza y lift."""

from collections import Counter
from itertools import combinations

import pandas as pd


def calcular_lift(
    df: pd.DataFrame,
    minimo_coocurrencias: int = 2,
    limite: int = 10,
) -> dict:
    """Calcula reglas de asociación a partir de las ventas de un comercio.

    Columnas necesarias: id_venta, id_producto y producto.
    Cada transacción cuenta una sola vez por producto.
    """
    columnas = {"id_venta", "id_producto", "producto"}

    if not columnas.issubset(df.columns):
        raise ValueError("Faltan columnas para calcular asociaciones.")

    datos = (
        df.dropna(subset=["id_venta", "id_producto"])
        .drop_duplicates(subset=["id_venta", "id_producto"])
    )

    compras = datos.groupby("id_venta")["id_producto"].apply(
        lambda productos: sorted(set(productos))
    )

    total = len(compras)

    if total == 0:
        return {"total_transacciones": 0, "asociaciones": []}

    nombres = (
        datos.drop_duplicates("id_producto")
        .set_index("id_producto")["producto"]
        .to_dict()
    )

    frecuencia = Counter()
    frecuencia_pares = Counter()

    for productos in compras:
        frecuencia.update(productos)
        frecuencia_pares.update(combinations(productos, 2))

    asociaciones = []

    for (a, b), juntos in frecuencia_pares.items():
        if juntos < minimo_coocurrencias:
            continue

        soporte = juntos / total
        prob_a = frecuencia[a] / total
        prob_b = frecuencia[b] / total
        lift = soporte / (prob_a * prob_b)

        for origen, destino in ((a, b), (b, a)):
            confianza = juntos / frecuencia[origen]

            asociaciones.append({
                "producto_origen": nombres[origen],
                "producto_destino": nombres[destino],
                "soporte": round(soporte * 100, 2),
                "confianza": round(confianza * 100, 2),
                "lift": round(lift, 3),
                "compras_conjuntas": juntos,
            })

    asociaciones.sort(
        key=lambda x: (
            -x["lift"],
            -x["confianza"],
            -x["compras_conjuntas"],
            x["producto_origen"],
        )
    )

    return {
        "total_transacciones": total,
        "asociaciones": asociaciones[:limite],
    }
