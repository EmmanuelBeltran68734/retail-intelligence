"""Conexión a la base de datos con SQLAlchemy."""
from sqlalchemy import URL, create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import config


def _crear_motor():
    if config.database_url:
        return create_engine(config.database_url)
    # URL.create arma la dirección por partes, así la contraseña puede tener
    # caracteres especiales (@, #, %...) sin tener que codificarlos a mano.
    url = URL.create(
        "postgresql+psycopg",
        username=config.db_user,
        password=config.db_password,
        host=config.db_host,
        port=config.db_port,
        database=config.db_name,
    )
    # Supabase exige conexión cifrada (SSL); el PostgreSQL local normalmente no la tiene.
    return create_engine(url, pool_pre_ping=True, connect_args={"sslmode": config.db_sslmode})


motor = _crear_motor()
SesionLocal = sessionmaker(bind=motor, autoflush=False)


class Base(DeclarativeBase):
    """Clase base de la que heredarán todas las tablas (comercio, usuario, venta...)."""


def obtener_sesion():
    """Entrega una sesión de base de datos a cada ruta y la cierra al terminar."""
    sesion = SesionLocal()
    try:
        yield sesion
    finally:
        sesion.close()
