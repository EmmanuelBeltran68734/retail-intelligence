
"""Pruebas del análisis de asociaciones de productos (O1)."""

import pandas as pd
import pytest

from app.servicios.asociaciones import calcular_lift


def datos_ejemplo():
    """Cuatro compras: dos con pan y leche juntos."""
    return pd.DataFrame([
        {"id_venta": 1, "id_producto": 10, "producto": "Pan"},
        {"id_venta": 1, "id_producto": 20, "producto": "Leche"},
        {"id_venta": 2, "id_producto": 10, "producto": "Pan"},
        {"id_venta": 2, "id_producto": 20, "producto": "Leche"},
        {"id_venta": 3, "id_producto": 10, "producto": "Pan"},
        {"id_venta": 3, "id_producto": 30, "producto": "Arroz"},
        {"id_venta": 4, "id_producto": 30, "producto": "Arroz"},
    ])


def test_calcula_soporte_confianza_y_lift():
    resultado = calcular_lift(datos_ejemplo())

    assert resultado["total_transacciones"] == 4

    asociaciones = resultado["asociaciones"]
    assert len(asociaciones) == 2

    pan_leche = next(
        a for a in asociaciones
        if a["producto_origen"] == "Pan"
        and a["producto_destino"] == "Leche"
    )

    assert pan_leche["compras_conjuntas"] == 2
    assert pan_leche["soporte"] == 50.0
    assert pan_leche["confianza"] == 66.67
    assert pan_leche["lift"] == 1.333


def test_confianza_cambia_segun_direccion():
    resultado = calcular_lift(datos_ejemplo())

    leche_pan = next(
        a for a in resultado["asociaciones"]
        if a["producto_origen"] == "Leche"
    )

    assert leche_pan["confianza"] == 100.0
    assert leche_pan["lift"] == 1.333


def test_no_cuenta_productos_duplicados():
    datos = datos_ejemplo()
    duplicado = datos.iloc[[0]]

    datos = pd.concat([datos, duplicado], ignore_index=True)

    resultado = calcular_lift(datos)

    assert resultado["total_transacciones"] == 4
    assert len(resultado["asociaciones"]) == 2
    assert resultado["asociaciones"][0]["compras_conjuntas"] == 2


def test_respeta_minimo_de_coocurrencias():
    resultado = calcular_lift(
        datos_ejemplo(),
        minimo_coocurrencias=3,
    )

    assert resultado["asociaciones"] == []


def test_sin_ventas():
    datos = pd.DataFrame(
        columns=["id_venta", "id_producto", "producto"]
    )

    resultado = calcular_lift(datos)

    assert resultado == {
        "total_transacciones": 0,
        "asociaciones": [],
    }


def test_columnas_faltantes():
    datos = pd.DataFrame({"id_venta": [1]})

    with pytest.raises(ValueError):
        calcular_lift(datos)
