
"""Pruebas del esquema de ventas con Pandera."""

from pathlib import Path

import pandas as pd
import pytest
from pandera.errors import SchemaErrors

from app.servicios.plantilla import leer_archivo
from app.servicios.validacion import validar
from app.servicios.esquema_ventas import ESQUEMA_VENTAS


def test_cantidad_negativa():
    # Ubicar nuestro archivo de ventas
    ruta = (
        Path(__file__).resolve().parents[2]
        / "datos"
        / "ventas_prueba.csv"
    )

    # Leer y normalizar los datos correctos
    df = leer_archivo(ruta.name, ruta.read_bytes())
    resultado = validar(df)

    assert len(resultado["errores"]) == 0

    ventas = pd.DataFrame(resultado["filas_validas"])

    # Introducir un error intencional
    ventas.loc[0, "cantidad"] = -2.0

    # Pandera debe rechazar el valor negativo
    with pytest.raises(SchemaErrors):
        ESQUEMA_VENTAS.validate(ventas, lazy=True)

def test_precio_negativo():
    # Leer el archivo de ventas
    ruta = (
        Path(__file__).resolve().parents[2]
        / "datos"
        / "ventas_prueba.csv"
    )

    df = leer_archivo(ruta.name, ruta.read_bytes())
    resultado = validar(df)

    assert len(resultado["errores"]) == 0

    ventas = pd.DataFrame(resultado["filas_validas"])

    # Introducir un precio incorrecto
    ventas.loc[0, "precio_unitario"] = -1000.0

    # Pandera debe detectar el precio negativo
    with pytest.raises(SchemaErrors):
        ESQUEMA_VENTAS.validate(ventas, lazy=True)

def test_descuento_negativo():
    # Leer el archivo de ventas
    ruta = (
        Path(__file__).resolve().parents[2]
        / "datos"
        / "ventas_prueba.csv"
    )

    df = leer_archivo(ruta.name, ruta.read_bytes())
    resultado = validar(df)

    assert len(resultado["errores"]) == 0

    ventas = pd.DataFrame(resultado["filas_validas"])

    # Introducir un descuento incorrecto
    ventas.loc[0, "descuento"] = -500.0

    # Pandera debe rechazar el descuento negativo
    with pytest.raises(SchemaErrors):
        ESQUEMA_VENTAS.validate(ventas, lazy=True)
        
        
def test_medio_pago_invalido():
    # Leer el archivo de ventas
    ruta = (
        Path(__file__).resolve().parents[2]
        / "datos"
        / "ventas_prueba.csv"
    )

    df = leer_archivo(ruta.name, ruta.read_bytes())
    resultado = validar(df)

    assert len(resultado["errores"]) == 0

    ventas = pd.DataFrame(resultado["filas_validas"])

    # Introducir un medio de pago no permitido
    ventas.loc[0, "medio_pago"] = "bitcoin"

    # Pandera debe detectar el medio de pago inválido
    with pytest.raises(SchemaErrors) as error:
        ESQUEMA_VENTAS.validate(ventas, lazy=True)

    # Confirmar que el error corresponde a medio_pago
    assert "medio_pago" in str(error.value)


def test_id_ticket_vacio():
    # Ubicar el archivo de ventas
    ruta = (
        Path(__file__).resolve().parents[2]
        / "datos"
        / "ventas_prueba.csv"
    )

    # Leer y normalizar los datos correctos
    df = leer_archivo(ruta.name, ruta.read_bytes())
    resultado = validar(df)

    assert len(resultado["errores"]) == 0

    ventas = pd.DataFrame(resultado["filas_validas"])

    # Introducir un campo obligatorio vacío
    ventas.loc[0, "id_ticket"] = ""

    # Pandera debe rechazar el campo vacío
    with pytest.raises(SchemaErrors) as error:
        ESQUEMA_VENTAS.validate(ventas, lazy=True)

    # Comprobar que el error sea de id_ticket
    assert "id_ticket" in str(error.value)

def test_fecha_invalida():
    # Cargar las ventas correctas
    ruta = (
        Path(__file__).resolve().parents[2]
        / "datos"
        / "ventas_prueba.csv"
    )

    df = leer_archivo(ruta.name, ruta.read_bytes())
    resultado = validar(df)

    assert len(resultado["errores"]) == 0

    ventas = pd.DataFrame(resultado["filas_validas"])

    # Introducir una fecha que no existe
    ventas.loc[0, "fecha"] = "2026-02-31"

    # Pandera debería rechazar la fecha inválida
    with pytest.raises(SchemaErrors):
        ESQUEMA_VENTAS.validate(ventas, lazy=True)
