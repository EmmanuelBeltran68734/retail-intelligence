"""Reglas de calidad de la carga (RF-02, RF-04).

INTERFAZ CON EL MÓDULO DE BIANCA
--------------------------------
El backend solo llama a `validar(df)`. Bianca puede reemplazar el cuerpo por sus
reglas con pandas + pandera mientras devuelva lo mismo:

    {
      "filas_validas": [ {fecha (AAAA-MM-DD), id_ticket, codigo_producto, nombre_producto,
                          categoria, cantidad (float), precio_unitario (float),
                          descuento (float), id_cliente (str|None), medio_pago (str|None)}, ... ],
      "errores": [ {fila, campo, tipo_error, valor, mensaje, sugerencia}, ... ],
    }

`fila` cuenta como en Excel: la fila 1 son los encabezados.
Esta es una versión inicial para que el flujo de carga funcione de punta a punta.
"""
import re
from datetime import date, datetime

import pandas as pd

from app.servicios.plantilla import MEDIOS_PAGO, OBLIGATORIAS

_FORMATOS_FECHA = ("%Y-%m-%d", "%d/%m/%Y", "%Y-%m-%d %H:%M:%S", "%d-%m-%Y")
_FECHA_NUMEROS = re.compile(r"^\s*(\d{1,4})[/-](\d{1,2})[/-](\d{1,4})")


def _fecha(texto: str) -> date | None:
    for formato in _FORMATOS_FECHA:
        try:
            return datetime.strptime(texto.strip(), formato).date()
        except ValueError:
            continue
    return None


def _numero(texto: str) -> float | None:
    """Acepta 3200, 3200.5, 3200,5, $3.200 y 1.250.000 (puntos de miles)."""
    limpio = texto.strip().replace("$", "").replace(" ", "")
    if re.fullmatch(r"\d{1,3}(\.\d{3})+", limpio):
        limpio = limpio.replace(".", "")
    elif "," in limpio and "." not in limpio:
        limpio = limpio.replace(",", ".")
    try:
        return float(limpio)
    except ValueError:
        return None


def _medio_pago(texto: str) -> str | None:
    t = texto.strip().lower().replace("é", "e").replace("í", "i")
    if t == "fiado":
        t = "credito"
    return t if t in MEDIOS_PAGO else None


def validar(df: pd.DataFrame) -> dict:
    errores: list[dict] = []
    validas: list[dict] = []
    vistas: dict[tuple, int] = {}

    def error(fila, campo, tipo, valor, mensaje, sugerencia):
        errores.append({"fila": fila, "campo": campo, "tipo_error": tipo, "valor": valor,
                        "mensaje": mensaje, "sugerencia": sugerencia})

    for posicion, registro in enumerate(df.to_dict("records")):
        fila = posicion + 2
        valores = {k: ("" if v is None else str(v)).strip() for k, v in registro.items()}
        if not any(valores.values()):
            continue  # fila totalmente vacía: se salta sin error
        errores_antes = len(errores)

        for campo in OBLIGATORIAS:
            if not valores.get(campo):
                error(fila, campo, "faltante", "", f"Fila {fila}: falta el dato de «{campo}».",
                      "Completa la celda o borra la fila.")

        fecha = None
        if valores.get("fecha"):
            fecha = _fecha(valores["fecha"])
            if fecha is None:
                if _FECHA_NUMEROS.match(valores["fecha"]):
                    error(fila, "fecha", "fecha_inexistente", valores["fecha"],
                          f"Fila {fila}: la fecha {valores['fecha']} no existe.", "Escríbala como AAAA-MM-DD.")
                else:
                    error(fila, "fecha", "fecha_invalida", valores["fecha"],
                          f"Fila {fila}: «{valores['fecha']}» no es una fecha.", "Escríbala como AAAA-MM-DD.")

        numeros = {}
        for campo, minimo_cero in (("cantidad", False), ("precio_unitario", False), ("descuento", True)):
            texto = valores.get(campo, "")
            if not texto:
                continue
            n = _numero(texto)
            if n is None:
                error(fila, campo, "no_numerico", texto, f"Fila {fila}: «{texto}» no es un número en «{campo}».",
                      "Escribe solo números, sin letras.")
            elif (n < 0) if minimo_cero else (n <= 0):
                limite = "mayor o igual a cero" if minimo_cero else "mayor que cero"
                sugerencia = ("Revisa si fue una devolución; las devoluciones no se cargan en esta versión."
                              if campo == "cantidad" else "Revisa el valor en el sistema de caja.")
                error(fila, campo, "fuera_de_rango", texto, f"Fila {fila}: «{campo}» debe ser {limite}.", sugerencia)
            else:
                numeros[campo] = n

        medio = None
        if valores.get("medio_pago"):
            medio = _medio_pago(valores["medio_pago"])
            if medio is None:
                error(fila, "medio_pago", "valor_no_permitido", valores["medio_pago"],
                      f"Fila {fila}: el medio de pago «{valores['medio_pago']}» no es válido.",
                      "Usa efectivo, tarjeta, transferencia o crédito.")

        clave = tuple(valores.get(c, "") for c in OBLIGATORIAS + ["descuento", "id_cliente", "medio_pago"])
        if clave in vistas:
            error(fila, "fila", "duplicada", "", f"Fila {fila}: está repetida (es igual a la fila {vistas[clave]}).",
                  "Borra una de las dos si es un error de copia.")
        else:
            vistas[clave] = fila

        if len(errores) == errores_antes:
            validas.append({
                "fecha": fecha.isoformat(),
                "id_ticket": valores["id_ticket"],
                "codigo_producto": valores["codigo_producto"],
                "nombre_producto": valores["nombre_producto"],
                "categoria": valores["categoria"],
                "cantidad": numeros["cantidad"],
                "precio_unitario": numeros["precio_unitario"],
                "descuento": numeros.get("descuento", 0.0),
                "id_cliente": valores.get("id_cliente") or None,
                "medio_pago": medio,
            })

    return {"filas_validas": validas, "errores": errores}
