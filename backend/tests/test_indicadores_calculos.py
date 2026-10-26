
"""Pruebas adicionales de los indicadores de ventas.

Comprobamos que los resultados y sus explicaciones sean
correctos cuando las ventas del negocio disminuyen.
"""

from datetime import date

import pandas as pd

from app.servicios.indicadores import resumen


def test_disminucion_de_ventas():
    # Registramos ventas por $100.000 en agosto.
    ventas_agosto = pd.DataFrame([
        {
            "id_venta": 1,
            "id_producto": 1,
            "importe": 100000.0,
        }
    ])

    # Registramos ventas por $80.000 en septiembre.
    ventas_septiembre = pd.DataFrame([
        {
            "id_venta": 2,
            "id_producto": 1,
            "importe": 80000.0,
        }
    ])

    # Calculamos los indicadores y comparamos ambos meses.
    resultado = resumen(
        ventas_septiembre,
        ventas_agosto,
        date(2026, 9, 1),
        date(2026, 9, 30),
        date(2026, 8, 1),
        date(2026, 8, 31),
    )

    # Verificamos el porcentaje y su explicación.
    assert resultado["crecimiento"]["valor"] == -20.0

    assert (
        resultado["crecimiento"]["frase"]
        == "Vendiste 20 % menos que en agosto."
    )

def test_ticket_promedio_con_varios_productos():
    """Comprobamos que cada ticket cuente como una sola venta."""

    ventas = pd.DataFrame([
        {"id_venta": 1, "id_producto": 1, "importe": 25000.0},
        {"id_venta": 1, "id_producto": 2, "importe": 15000.0},
        {"id_venta": 2, "id_producto": 3, "importe": 60000.0},
    ])

    ventas_anteriores = pd.DataFrame()

    resultado = resumen(
        ventas,
        ventas_anteriores,
        date(2026, 9, 1),
        date(2026, 9, 30),
        date(2026, 8, 1),
        date(2026, 8, 31),
    )

    assert resultado["ventas_totales"]["valor"] == 100000
    assert resultado["transacciones"]["valor"] == 2
    assert resultado["ticket_promedio"]["valor"] == 50000
    assert resultado["crecimiento"]["valor"] is None

def test_concentracion_de_ventas():
    """Comprobamos cuánto representan los 10 productos principales."""

    ventas = pd.DataFrame([
        {
            "id_venta": numero,
            "id_producto": numero,
            "importe": 100.0 if numero <= 10 else 50.0,
        }
        for numero in range(1, 13)
    ])

    resultado = resumen(
        ventas,
        pd.DataFrame(),
        date(2026, 9, 1),
        date(2026, 9, 30),
        date(2026, 8, 1),
        date(2026, 8, 31),
    )

    assert resultado["ventas_totales"]["valor"] == 1100.0
    assert resultado["concentracion"]["top_productos"] == 10
    assert resultado["concentracion"]["valor"] == 90.9

    assert "90,9 %" in resultado["concentracion"]["frase"]
