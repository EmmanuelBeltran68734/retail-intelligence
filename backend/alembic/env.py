"""Alembic usa la misma conexión que la API (app/db.py), así que lee el .env."""
from logging.config import fileConfig

from alembic import context

from app import modelos  # noqa: F401  (registra las tablas en Base.metadata)
from app.db import Base, motor

target_metadata = Base.metadata

# Muestra en la terminal qué migraciones se aplican.
if context.config.config_file_name:
    fileConfig(context.config.config_file_name)


def correr_migraciones() -> None:
    with motor.connect() as conexion:
        context.configure(connection=conexion, target_metadata=target_metadata, compare_type=True)
        with context.begin_transaction():
            context.run_migrations()


correr_migraciones()
