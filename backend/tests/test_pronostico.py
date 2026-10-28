
"""Pruebas automatizadas del pronóstico de Retail Intelligence."""

import pandas as pd
import pytest

from app.servicios.pronostico import pronosticar


def crear_ventas_prueba(semanas=12):
    """Creamos ventas semanales para probar el modelo."""
    fechas = pd.date_range(
        "2026-04-06",
        periods=semanas,
        freq="W-MON",
    )

    registros = []

    for i, fecha in enumerate(fechas):
        for categoria, precio_base in [
            ("Aseo", 1500),
            ("Bebidas", 1000),
        ]:
            precio = (
                precio_base
                + i * 40
                + [0, 120, -50, 70][i % 4]
            )

            registros.append({
                "fecha": fecha.strftime("%Y-%m-%d"),
                "categoria": categoria,
                "cantidad": 1,
                "precio_unitario": precio,
                "descuento": 0,
            })

    return pd.DataFrame(registros)


def test_pronostico_genera_cuatro_semanas():
    """Verificamos que el modelo genere los resultados esperados."""
    datos = crear_ventas_prueba()

    resultado = pronosticar(datos, semanas=4)

    # Esperamos 4 semanas para TOTAL, Aseo y Bebidas.
    assert len(resultado) == 12

    assert set(resultado["categoria"]) == {
        "TOTAL", "Aseo", "Bebidas"
    }

    assert resultado["ventas_pronosticadas"].notna().all()
    assert (resultado["ventas_pronosticadas"] >= 0).all()

    # Las predicciones deben corresponder a semanas futuras.
    primera_semana = pd.to_datetime(
        resultado["semana_fin"]
    ).min()

    ultima_semana_historica = pd.to_datetime(
        datos["fecha"]
    ).max()

    assert primera_semana > ultima_semana_historica


def test_pronostico_rechaza_semanas_invalidas():
    """No permitimos solicitar cero semanas de pronóstico."""
    datos = crear_ventas_prueba()

    with pytest.raises(ValueError):
        pronosticar(datos, semanas=0)


def test_pronostico_rechaza_historial_insuficiente():
    """El modelo debe avisar cuando faltan semanas históricas."""
    datos = crear_ventas_prueba(semanas=6)

    with pytest.raises(
        ValueError,
        match="No hay suficientes semanas",
    ):
        pronosticar(datos, semanas=4)
