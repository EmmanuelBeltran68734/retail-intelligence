
"""Pruebas de integración de la validación de ventas.

Comprobamos que nuestro módulo procese los archivos correctos,
identifique los registros con errores y permita omitir las
columnas opcionales de la plantilla.
"""

from pathlib import Path

import pandas as pd

from app.servicios.validacion import validar


RUTA_VENTAS = (
    Path(__file__).resolve().parents[2]
    / "datos"
    / "ventas_prueba.csv"
)


def cargar_ventas():
    """Cargamos tres registros para realizar las pruebas."""
    return pd.read_csv(
        RUTA_VENTAS,
        dtype=str,
        keep_default_na=False,
    ).head(3).copy()


def test_ventas_correctas():
    ventas = cargar_ventas()
    resultado = validar(ventas)

    assert len(resultado["filas_validas"]) == 3
    assert len(resultado["errores"]) == 0


def test_cantidad_negativa_integracion():
    ventas = cargar_ventas()
    ventas.loc[1, "cantidad"] = "-2"

    resultado = validar(ventas)

    assert len(resultado["filas_validas"]) == 2
    assert len(resultado["errores"]) == 1
    assert resultado["errores"][0]["fila"] == 3
    assert resultado["errores"][0]["campo"] == "cantidad"


def test_columnas_opcionales():
    ventas = cargar_ventas().drop(
        columns=["descuento", "id_cliente", "medio_pago"]
    )

    resultado = validar(ventas)

    assert len(resultado["filas_validas"]) == 3
    assert len(resultado["errores"]) == 0

    for registro in resultado["filas_validas"]:
        assert registro["descuento"] == 0.0
        assert registro["id_cliente"] is None
        assert registro["medio_pago"] is None
