
"""Esquema de validación de ventas para Retail Intelligence."""

import pandera.pandas as pa
import pandas as pd

ESQUEMA_VENTAS = pa.DataFrameSchema(
    {
        
        "fecha": pa.Column(
            str,
            [
                pa.Check.str_matches(r"^\d{4}-\d{2}-\d{2}$"),
                pa.Check(
                    lambda serie: pd.to_datetime(
                        serie,
                        format="%Y-%m-%d",
                        errors="coerce"
                    ).notna(),
                    error="La fecha no existe o no es válida"
                ),
            ],
        ),
        "id_ticket": pa.Column(
            str, pa.Check.str_length(min_value=1)
        ),
        "codigo_producto": pa.Column(
            str, pa.Check.str_length(min_value=1)
        ),
        "nombre_producto": pa.Column(
            str, pa.Check.str_length(min_value=1)
        ),
        "categoria": pa.Column(
            str, pa.Check.str_length(min_value=1)
        ),
        "cantidad": pa.Column(
            float, pa.Check.gt(0)
        ),
        "precio_unitario": pa.Column(
            float, pa.Check.gt(0)
        ),
        "descuento": pa.Column(
            float, pa.Check.ge(0)
        ),
        "id_cliente": pa.Column(
            str, nullable=True
        ),
        "medio_pago": pa.Column(
            str,
            pa.Check.isin([
                "efectivo", "tarjeta",
                "transferencia", "credito"
            ]),
            nullable=True
        ),

    },
    strict=True,
)
