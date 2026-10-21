"""Indicadores del tablero (RF-05, RF-06).

INTERFAZ CON EL MÓDULO DE BIANCA
--------------------------------
El backend arma un DataFrame con una fila por producto vendido y llama a
`resumen(...)` y `serie(...)`. Bianca puede mejorar los cálculos y las frases
mientras las funciones reciban y devuelvan lo mismo.

Columnas del DataFrame:
    fecha (date), id_venta (int), id_producto (int), producto (str),
    id_categoria (int), categoria (str), id_cliente (int|None), cliente (str|None),
    importe (float) = cantidad * precio_unitario - descuento
"""
from datetime import date, timedelta

import pandas as pd

MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
         "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]
TOP_PRODUCTOS = 10


# --- Formato en español de Colombia --------------------------------------------

def entero(n: float) -> str:
    """1430 -> «1.430»."""
    return f"{round(n):,}".replace(",", ".")


def decimal(n: float) -> str:
    """8.4 -> «8,4»; 8.0 -> «8»."""
    texto = f"{n:.1f}".replace(".", ",")
    return texto[:-2] if texto.endswith(",0") else texto


def dinero(n: float) -> str:
    """18452300 -> «$18,5 millones»; 12904 -> «$12.904»."""
    if abs(n) >= 1_000_000:
        millones = round(n / 1_000_000, 1)
        return f"${decimal(millones)} {'millón' if millones == 1 else 'millones'}"
    return f"${entero(n)}"


def es_mes_completo(desde: date, hasta: date) -> bool:
    siguiente = (hasta.replace(day=28) + timedelta(days=4)).replace(day=1)
    return desde.day == 1 and desde.month == hasta.month and desde.year == hasta.year and hasta == siguiente - timedelta(days=1)


def nombre_periodo(desde: date, hasta: date) -> str:
    """«septiembre» si es un mes completo; si no, «los 30 días anteriores»."""
    if es_mes_completo(desde, hasta):
        return MESES[desde.month - 1]
    dias = (hasta - desde).days + 1
    return f"los {dias} días anteriores" if dias != 1 else "el día anterior"


# --- Cálculos -----------------------------------------------------------------

def _totales(df: pd.DataFrame) -> tuple[float, int]:
    if df.empty:
        return 0.0, 0
    return float(df["importe"].sum()), int(df["id_venta"].nunique())


def resumen(df: pd.DataFrame, df_anterior: pd.DataFrame,
            desde: date, hasta: date, desde_ant: date, hasta_ant: date) -> dict:
    """Tarjetas de P02 y P06: ventas, transacciones, ticket promedio, crecimiento y concentración."""
    ventas, transacciones = _totales(df)
    ventas_ant, _ = _totales(df_anterior)
    mes = es_mes_completo(desde, hasta)
    cuando = f"En {MESES[desde.month - 1]}" if mes else "En este período"

    ticket = ventas / transacciones if transacciones else 0.0

    if ventas_ant > 0:
        crecimiento = round((ventas - ventas_ant) / ventas_ant * 100, 1)
        referencia = f"en {nombre_periodo(desde_ant, hasta_ant)}" if mes else nombre_periodo(desde_ant, hasta_ant)
        if crecimiento > 0:
            frase_crec = f"Vendiste {decimal(crecimiento)} % más que {referencia}."
        elif crecimiento < 0:
            frase_crec = f"Vendiste {decimal(-crecimiento)} % menos que {referencia}."
        else:
            frase_crec = f"Vendiste lo mismo que {referencia}."
    else:
        crecimiento = None
        frase_crec = "Todavía no hay ventas del período anterior para comparar."

    por_producto = df.groupby("id_producto")["importe"].sum().sort_values(ascending=False) if not df.empty else pd.Series(dtype=float)
    top = min(TOP_PRODUCTOS, len(por_producto))
    concentracion = round(float(por_producto.head(top).sum()) / ventas * 100, 1) if ventas else 0.0
    if top == 0:
        frase_conc = "Todavía no hay productos vendidos en este período."
    elif top == 1:
        frase_conc = "Un solo producto explica todas tus ventas del período."
    else:
        frase_conc = f"Tus {top} productos más vendidos explican el {decimal(concentracion)} % de tus ventas."

    return {
        "periodo": {"desde": desde, "hasta": hasta},
        "periodo_anterior": {"desde": desde_ant, "hasta": hasta_ant},
        "ventas_totales": {"valor": round(ventas, 2), "frase": f"{cuando} vendiste {dinero(ventas)}."},
        "transacciones": {"valor": transacciones,
                          "frase": "Hiciste 1 venta." if transacciones == 1 else f"Hiciste {entero(transacciones)} ventas."},
        "ticket_promedio": {"valor": round(ticket), "frase": f"En promedio, cada cliente gastó {dinero(ticket)}."},
        "crecimiento": {"valor": crecimiento, "frase": frase_crec},
        "concentracion": {"valor": concentracion, "top_productos": top, "frase": frase_conc},
    }


def _fecha_corta(d: date) -> str:
    return f"{d.day} {MESES_CORTOS[d.month - 1]}"


def serie(df: pd.DataFrame, agrupar: str, desde: date, hasta: date, limite: int = 10) -> list[dict]:
    """Puntos para los gráficos de P02 y P06."""
    if df.empty:
        return []
    df = df.copy()

    if agrupar == "dia":
        dias = pd.date_range(desde, hasta, freq="D").date
        g = df.groupby("fecha").agg(ventas=("importe", "sum"), transacciones=("id_venta", "nunique"))
        return [{"etiqueta": _fecha_corta(d), "inicio": d,
                 "ventas": round(float(g["ventas"].get(d, 0)), 2), "transacciones": int(g["transacciones"].get(d, 0))}
                for d in dias]

    if agrupar == "semana":
        # Semanas de 7 días contadas desde el inicio del período (1–7 sep, 8–14 sep...).
        df["bloque"] = df["fecha"].map(lambda f: (f - desde).days // 7)
        g = df.groupby("bloque").agg(ventas=("importe", "sum"), transacciones=("id_venta", "nunique"))
        puntos = []
        for b in range((hasta - desde).days // 7 + 1):
            inicio = desde + timedelta(days=7 * b)
            fin = min(inicio + timedelta(days=6), hasta)
            etiqueta = (f"{inicio.day}–{fin.day} {MESES_CORTOS[fin.month - 1]}" if inicio.month == fin.month
                        else f"{_fecha_corta(inicio)}–{_fecha_corta(fin)}")
            puntos.append({"etiqueta": etiqueta, "inicio": inicio,
                           "ventas": round(float(g["ventas"].get(b, 0)), 2), "transacciones": int(g["transacciones"].get(b, 0))})
        return puntos

    if agrupar == "mes":
        df["mes"] = df["fecha"].map(lambda f: f.replace(day=1))
        g = df.groupby("mes").agg(ventas=("importe", "sum"), transacciones=("id_venta", "nunique")).sort_index()
        return [{"etiqueta": f"{MESES_CORTOS[m.month - 1]} {m.year}", "inicio": m,
                 "ventas": round(float(fila.ventas), 2), "transacciones": int(fila.transacciones)}
                for m, fila in g.iterrows()]

    if agrupar == "dia_semana":
        df["dia"] = df["fecha"].map(lambda f: f.weekday())
        g = df.groupby("dia").agg(ventas=("importe", "sum"), transacciones=("id_venta", "nunique"))
        return [{"etiqueta": DIAS[d], "orden": d + 1,
                 "ventas": round(float(g["ventas"].get(d, 0)), 2), "transacciones": int(g["transacciones"].get(d, 0))}
                for d in range(7)]

    columnas = {"categoria": ("id_categoria", "categoria"), "producto": ("id_producto", "producto"),
                "cliente": ("id_cliente", "cliente")}[agrupar]
    datos = df.dropna(subset=[columnas[0]])
    g = (datos.groupby(list(columnas)).agg(ventas=("importe", "sum"), transacciones=("id_venta", "nunique"))
         .reset_index().sort_values("ventas", ascending=False))
    if agrupar != "categoria":
        g = g.head(limite)
    return [{"etiqueta": fila[columnas[1]], "id": int(fila[columnas[0]]),
             "ventas": round(float(fila["ventas"]), 2), "transacciones": int(fila["transacciones"])}
            for _, fila in g.iterrows()]
