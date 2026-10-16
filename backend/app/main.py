"""Punto de entrada de la API de Retail Intelligence."""
from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db import obtener_sesion

app = FastAPI(
    title="Retail Intelligence API",
    description="Backend del proyecto: usuarios, carga de ventas, catálogo, indicadores y ABC (RF-01 a RF-07).",
    version="0.1.0",
)


@app.get("/salud", tags=["salud"])
def salud():
    """Ruta de prueba: responde si el servidor está encendido."""
    return {"estado": "ok", "servicio": "retail-intelligence-api"}


@app.get("/salud/db", tags=["salud"])
def salud_db(sesion: Session = Depends(obtener_sesion)):
    """Ruta de prueba: responde si la conexión a la base de datos funciona."""
    try:
        version = sesion.execute(text("select version()")).scalar_one()
    except Exception as error:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=f"No hay conexión con la base de datos: {error}")
    return {"estado": "ok", "base_de_datos": version}
