"""Las pruebas usan una base SQLite en memoria: no necesitan PostgreSQL ni internet."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base, obtener_sesion
from app.main import app
from app.modelos import Rol


@pytest.fixture()
def cliente():
    motor = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(motor)
    Sesion = sessionmaker(bind=motor)
    with Sesion() as s:
        s.add_all([Rol(id_rol=1, nombre="propietario"), Rol(id_rol=2, nombre="encargado"), Rol(id_rol=3, nombre="administrador")])
        s.commit()

    def _sesion_de_prueba():
        with Sesion() as s:
            yield s

    app.dependency_overrides[obtener_sesion] = _sesion_de_prueba
    yield TestClient(app)
    app.dependency_overrides.clear()


def registrar(cliente, correo="marta@ejemplo.com", comercio="Tienda Doña Marta"):
    return cliente.post("/api/auth/registro", json={
        "comercio": comercio, "ciudad": "Cartagena", "nombre": "Marta Pérez",
        "correo": correo, "contrasena": "minimo8caracteres",
    })
