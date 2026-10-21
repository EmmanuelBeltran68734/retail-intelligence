"""Errores con la forma del contrato: {"error": "...", "mensaje": "..."}.

Los mensajes de validación de Pydantic vienen en inglés; aquí se traducen a
frases cortas en español que el frontend puede mostrar tal cual (RNF-01).
"""
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class ErrorApi(Exception):
    def __init__(self, estado: int, error: str, mensaje: str, **extra):
        self.estado, self.error, self.mensaje, self.extra = estado, error, mensaje, extra


def _nombre_campo(error: dict) -> str:
    partes = [str(p) for p in error.get("loc", []) if p not in ("body", "query", "path")]
    return ".".join(partes) or "datos"


def traducir(error: dict) -> str:
    """Convierte un error de Pydantic en un mensaje en español."""
    campo = _nombre_campo(error)
    tipo = error.get("type", "")
    ctx = error.get("ctx") or {}

    if tipo == "missing":
        return f"Falta el campo «{campo}»."
    if tipo == "json_invalid":
        return "Los datos enviados no tienen un formato válido."
    if campo == "correo" or "email" in str(error.get("msg", "")).lower():
        return "El correo no es válido. Revisa que tenga @ y un dominio, por ejemplo nombre@correo.com."
    if tipo == "string_too_short":
        return f"El campo «{campo}» es muy corto: debe tener al menos {ctx.get('min_length')} caracteres."
    if tipo == "string_too_long":
        return f"El campo «{campo}» es muy largo: máximo {ctx.get('max_length')} caracteres."
    if tipo == "string_type":
        return f"El campo «{campo}» debe ser un texto."
    if tipo == "bool_parsing" or tipo == "bool_type":
        return f"El campo «{campo}» debe ser verdadero o falso."
    if tipo == "uuid_parsing" or tipo == "uuid_type":
        return f"El identificador «{campo}» no es válido."
    if tipo in ("int_parsing", "int_type", "float_parsing", "float_type"):
        return f"El campo «{campo}» debe ser un número."
    return f"El campo «{campo}» no tiene un valor válido."


def registrar_manejadores(app: FastAPI) -> None:
    @app.exception_handler(ErrorApi)
    async def _error_api(_: Request, exc: ErrorApi):
        return JSONResponse(status_code=exc.estado, content={"error": exc.error, "mensaje": exc.mensaje, **exc.extra})

    @app.exception_handler(RequestValidationError)
    async def _datos_invalidos(_: Request, exc: RequestValidationError):
        errores = exc.errors()
        mensaje = traducir(errores[0]) if errores else "Los datos enviados no son válidos."
        return JSONResponse(status_code=400, content={"error": "datos_invalidos", "mensaje": mensaje})
