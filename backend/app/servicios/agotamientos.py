"""Agotamientos con evidencia (O2).

Una racha sin ventas NO prueba que un producto se agotó. Este módulo separa tres casos:
- confirmado: hay un conteo de existencias en cero después de la última venta;
- con_existencias: el conteo muestra unidades, así que no fue agotamiento;
- posible: la racha es rara, pero no hay conteo que lo confirme (confianza baja).

Regla provisional, con los parámetros en un solo lugar para ajustarla cuando el frente de datos la cierre:
solo cuentan los días en que el negocio vendió algo; una racha es rara si el producto lleva al menos
DIAS_MINIMOS días de venta sin venderse y al menos FACTOR veces lo que normalmente tarda entre una venta y otra.
"""
import math
from datetime import date, timedelta

import pandas as pd

VENTANA_DIAS = 90      # historia que se mira hacia atrás
DIAS_MINIMOS = 3       # racha mínima (en días en que el negocio vendió)
FACTOR = 3             # veces la frecuencia habitual del producto
MINIMO_DIAS_CON_VENTA = 3  # un producto con menos días de venta no tiene una frecuencia confiable

REGLA = {
    "ventana_dias": VENTANA_DIAS,
    "dias_minimos": DIAS_MINIMOS,
    "factor": FACTOR,
    "minimo_dias_con_venta": MINIMO_DIAS_CON_VENTA,
    "descripcion": (f"Solo cuentan los días en que el negocio vendió algo. Un producto se marca si lleva al menos "
                    f"{DIAS_MINIMOS} de esos días sin venderse y al menos {FACTOR} veces lo que normalmente tarda "
                    "entre una venta y otra. Solo se afirma «se agotó» si un conteo de existencias dice 0."),
}

ORDEN = {"confirmado": 0, "posible": 1, "con_existencias": 2}


def _fecha(d: date) -> str:
    return d.strftime("%d/%m/%Y")


def detectar(ventas: pd.DataFrame, conteos: pd.DataFrame, hasta: date) -> list[dict]:
    """ventas: una fila por producto vendido (fecha, id_producto, codigo, producto, categoria).
    conteos: fecha, id_producto, existencias. Devuelve los productos con una racha rara."""
    if ventas.empty:
        return []
    desde = hasta - timedelta(days=VENTANA_DIAS - 1)
    ventas = ventas[(ventas["fecha"] >= desde) & (ventas["fecha"] <= hasta)]
    dias_negocio = sorted(set(ventas["fecha"]))
    resultado = []
    for id_producto, grupo in ventas.groupby("id_producto"):
        dias_producto = sorted(set(grupo["fecha"]))
        if len(dias_producto) < MINIMO_DIAS_CON_VENTA:
            continue
        ultima = dias_producto[-1]
        activos_desde_primera = [d for d in dias_negocio if d >= dias_producto[0]]
        activos_hasta_ultima = [d for d in activos_desde_primera if d <= ultima]
        cada = len(activos_hasta_ultima) / len(dias_producto)  # se vende 1 de cada `cada` días de venta
        racha = sum(1 for d in dias_negocio if d > ultima)
        if racha < max(DIAS_MINIMOS, math.ceil(FACTOR * cada)):
            continue

        fila = grupo.iloc[0]
        posteriores = conteos[(conteos["id_producto"] == id_producto) & (conteos["fecha"] >= ultima)] \
            if not conteos.empty else conteos
        evidencia = None
        if posteriores is not None and not posteriores.empty:
            ultimo = posteriores.sort_values("fecha").iloc[-1]
            evidencia = {"fecha": ultimo["fecha"], "existencias": float(ultimo["existencias"])}

        if cada < 1.5:
            habitual = "normalmente se vende todos los días"
        else:
            habitual = f"normalmente se vende 1 de cada {cada:.1f} días".replace(".", ",").replace(",0 ", " ")
        if evidencia is not None and evidencia["existencias"] <= 0:
            tipo, confianza = "confirmado", "alta"
            mensaje = (f"Se agotó: el conteo del {_fecha(evidencia['fecha'])} dice 0 unidades. "
                       f"No se vende desde el {_fecha(ultima)}.")
        elif evidencia is not None:
            tipo, confianza = "con_existencias", "alta"
            unidades = f"{evidencia['existencias']:g}"
            mensaje = (f"Dejó de venderse, pero el conteo del {_fecha(evidencia['fecha'])} muestra {unidades} "
                       "unidades: no fue un agotamiento. Revisa si está a la vista o si cambió la demanda.")
        else:
            tipo, confianza = "posible", "baja"
            mensaje = (f"Posible agotamiento: lleva {racha} días de venta sin venderse y {habitual}. "
                       "No tenemos un conteo de existencias que lo confirme.")
        resultado.append({
            "producto": {"id": int(id_producto), "codigo": fila["codigo"], "nombre": fila["producto"],
                         "categoria": fila["categoria"]},
            "ultima_venta": ultima,
            "dias_sin_venta": racha,
            "se_vende_cada_dias": round(cada, 1),
            "tipo": tipo,
            "confianza": confianza,
            "evidencia": evidencia,
            "mensaje": mensaje,
        })
    resultado.sort(key=lambda r: (ORDEN[r["tipo"]], -r["dias_sin_venta"]))
    return resultado
