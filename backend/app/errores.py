"""Errores con la forma del contrato: {"error": "...", "mensaje": "..."}."""
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class ErrorApi(Exception):
    def __init__(self, estado: int, error: str, mensaje: str):
        self.estado, self.error, self.mensaje = estado, error, mensaje


def registrar_manejadores(app: FastAPI) -> None:
    @app.exception_handler(ErrorApi)
    async def _error_api(_: Request, exc: ErrorApi):
        return JSONResponse(status_code=exc.estado, content={"error": exc.error, "mensaje": exc.mensaje})

    @app.exception_handler(RequestValidationError)
    async def _datos_invalidos(_: Request, exc: RequestValidationError):
        primero = exc.errors()[0] if exc.errors() else {}
        campo = ".".join(str(p) for p in primero.get("loc", []) if p != "body")
        return JSONResponse(
            status_code=400,
            content={"error": "datos_invalidos", "mensaje": f"Revisa el campo «{campo}»: {primero.get('msg', 'dato no válido')}."},
        )
