
"""Validación y control de calidad de los datos de ventas.

En este módulo revisamos los archivos de ventas que se cargan en
Retail Intelligence, de acuerdo con los requisitos RF-02 y RF-04.

Comprobamos que los campos obligatorios estén completos, que las
fechas sean válidas, que los valores numéricos estén dentro de los
rangos permitidos y que no existan registros duplicados.

También utilizamos Pandera para comprobar que los datos cumplan
con el esquema establecido.

Al finalizar, separamos las ventas válidas de los errores
encontrados y conservamos la numeración original de las filas.
"""

import math
import re
from datetime import date, datetime

import pandas as pd
from pandera.errors import SchemaErrors

from app.servicios.esquema_ventas import ESQUEMA_VENTAS
from app.servicios.plantilla import MEDIOS_PAGO, OBLIGATORIAS


# Formatos de fecha aceptados durante la carga.
_FORMATOS_FECHA = (
    "%Y-%m-%d",
    "%d/%m/%Y",
    "%Y-%m-%d %H:%M:%S",
    "%d-%m-%Y",
)

_FECHA_NUMEROS = re.compile(
    r"^\s*(\d{1,4})[/-](\d{1,2})[/-](\d{1,4})"
)


def _fecha(texto: str) -> date | None:
    """Convertimos las fechas ingresadas a un formato válido."""

    for formato in _FORMATOS_FECHA:
        try:
            return datetime.strptime(
                texto.strip(), formato
            ).date()
        except ValueError:
            continue

    return None


def _numero(texto: str) -> float | None:
    """Convertimos valores numéricos utilizados en las ventas."""

    limpio = (
        texto.strip()
        .replace("$", "")
        .replace(" ", "")
    )

    # Reconocemos los puntos utilizados como separadores de miles.
    if re.fullmatch(r"\d{1,3}(\.\d{3})+", limpio):
        limpio = limpio.replace(".", "")

    # Aceptamos la coma como separador decimal.
    elif "," in limpio and "." not in limpio:
        limpio = limpio.replace(",", ".")

    try:
        numero = float(limpio)
        return numero if math.isfinite(numero) else None
    except ValueError:
        return None


def _medio_pago(texto: str) -> str | None:
    """Unificamos los nombres de los medios de pago."""

    medio = (
        texto.strip()
        .lower()
        .replace("é", "e")
        .replace("í", "i")
    )

    if medio == "fiado":
        medio = "credito"

    return medio if medio in MEDIOS_PAGO else None


def validar(df: pd.DataFrame) -> dict:
    """Revisamos las ventas y registramos los errores encontrados."""

    errores: list[dict] = []
    validas: list[dict] = []
    filas_origen: list[int] = []
    vistas: dict[tuple, int] = {}

    def error(fila, campo, tipo, valor, mensaje, sugerencia):
        """Registramos cada problema con su ubicación y solución."""

        errores.append({
            "fila": fila,
            "campo": campo,
            "tipo_error": tipo,
            "valor": valor,
            "mensaje": mensaje,
            "sugerencia": sugerencia,
        })

    # PRIMERA ETAPA: REVISIÓN Y NORMALIZACIÓN DE LAS VENTAS

    for posicion, registro in enumerate(df.to_dict("records")):
        fila = posicion + 2

        valores = {
            campo: (
                ""
                if pd.isna(valor)
                else str(valor).strip()
            )
            for campo, valor in registro.items()
        }

        # Ignoramos las filas que están completamente vacías.
        if not any(valores.values()):
            continue

        errores_antes = len(errores)

        # Comprobamos que los campos obligatorios estén completos.
        for campo in OBLIGATORIAS:
            if not valores.get(campo):
                error(
                    fila,
                    campo,
                    "faltante",
                    "",
                    f"Fila {fila}: falta el dato de «{campo}».",
                    "Completa la celda o elimina la fila vacía.",
                )

        # Verificamos que las fechas sean reales y válidas.
        fecha = None

        if valores.get("fecha"):
            fecha = _fecha(valores["fecha"])

            if fecha is None:
                if _FECHA_NUMEROS.match(valores["fecha"]):
                    error(
                        fila,
                        "fecha",
                        "fecha_inexistente",
                        valores["fecha"],
                        f"Fila {fila}: la fecha "
                        f"{valores['fecha']} no existe.",
                        "Revisa la fecha y utiliza el formato AAAA-MM-DD.",
                    )
                else:
                    error(
                        fila,
                        "fecha",
                        "fecha_invalida",
                        valores["fecha"],
                        f"Fila {fila}: «{valores['fecha']}» "
                        "no es una fecha válida.",
                        "Escribe la fecha en formato AAAA-MM-DD.",
                    )

        # Revisamos las cantidades, precios y descuentos.
        numeros = {}

        for campo, permite_cero in (
            ("cantidad", False),
            ("precio_unitario", False),
            ("descuento", True),
        ):
            texto = valores.get(campo, "")

            if not texto:
                continue

            numero = _numero(texto)

            if numero is None:
                error(
                    fila,
                    campo,
                    "no_numerico",
                    texto,
                    f"Fila {fila}: «{texto}» no es un número "
                    f"válido en «{campo}».",
                    "Ingresa un valor numérico válido.",
                )
                continue

            valor_invalido = (
                numero < 0
                if permite_cero
                else numero <= 0
            )

            if valor_invalido:
                limite = (
                    "mayor o igual a cero"
                    if permite_cero
                    else "mayor que cero"
                )

                sugerencia = (
                    "Revisa si se trata de una devolución. "
                    "Por ahora, no procesamos devoluciones."
                    if campo == "cantidad"
                    else "Verifica el valor registrado en la venta."
                )

                error(
                    fila,
                    campo,
                    "fuera_de_rango",
                    texto,
                    f"Fila {fila}: «{campo}» debe ser {limite}.",
                    sugerencia,
                )

            else:
                numeros[campo] = numero

        # Verificamos que el medio de pago esté permitido.
        medio = None

        if valores.get("medio_pago"):
            medio = _medio_pago(valores["medio_pago"])

            if medio is None:
                error(
                    fila,
                    "medio_pago",
                    "valor_no_permitido",
                    valores["medio_pago"],
                    f"Fila {fila}: el medio de pago "
                    f"«{valores['medio_pago']}» no es válido.",
                    "Utiliza efectivo, tarjeta, transferencia o crédito.",
                )

        # Comprobamos si la venta aparece duplicada.
        columnas_duplicados = list(OBLIGATORIAS) + [
            "descuento",
            "id_cliente",
            "medio_pago",
        ]

        clave = tuple(
            valores.get(campo, "")
            for campo in columnas_duplicados
        )

        if clave in vistas:
            error(
                fila,
                "fila",
                "duplicada",
                "",
                f"Fila {fila}: este registro es igual "
                f"al de la fila {vistas[clave]}.",
                "Verifica si la venta está repetida.",
            )
        else:
            vistas[clave] = fila

        # Guardamos solamente las ventas sin errores iniciales.
        if len(errores) == errores_antes:
            filas_origen.append(fila)

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

    # SEGUNDA ETAPA: VALIDACIÓN DEL ESQUEMA CON PANDERA
    # Esta revisión se realiza una sola vez, al finalizar el ciclo.

    if validas:
        try:
            ESQUEMA_VENTAS.validate(
                pd.DataFrame(validas),
                lazy=True,
            )

        except SchemaErrors as excepcion:
            indices_invalidos = set()
            error_general = False

            # Revisamos los errores detectados por Pandera.
            for _, fallo in excepcion.failure_cases.iterrows():
                indice = fallo["index"]
                campo = fallo["column"]

                campo = (
                    "archivo"
                    if pd.isna(campo)
                    else str(campo)
                )

                valor = str(fallo["failure_case"])

                # Los errores sin índice afectan la estructura general.
                if pd.isna(indice):
                    error_general = True

                    error(
                        1,
                        campo,
                        "validacion_pandera",
                        valor,
                        f"El esquema de ventas presenta "
                        f"un problema en «{campo}».",
                        "Revisa la estructura y los tipos de datos.",
                    )
                    continue

                # Identificamos la fila original del archivo.
                posicion = int(indice)

                if posicion < 0 or posicion >= len(filas_origen):
                    error_general = True

                    error(
                        1,
                        campo,
                        "validacion_pandera",
                        valor,
                        "No se pudo identificar la fila del error.",
                        "Revisa la estructura del archivo.",
                    )
                    continue

                indices_invalidos.add(posicion)
                fila_original = filas_origen[posicion]

                error(
                    fila_original,
                    campo,
                    "validacion_pandera",
                    valor,
                    f"Fila {fila_original}: el valor de "
                    f"«{campo}» no cumple las reglas establecidas.",
                    "Revisa y corrige el dato indicado.",
                )

            # Retiramos los registros rechazados por Pandera.
            if error_general:
                validas = []
            else:
                validas = [
                    registro
                    for posicion, registro in enumerate(validas)
                    if posicion not in indices_invalidos
                ]

    # TERCERA ETAPA: RESULTADO FINAL
    # Devolvemos las ventas válidas y los errores encontrados.

    return {
        "filas_validas": validas,
        "errores": errores,
    }
