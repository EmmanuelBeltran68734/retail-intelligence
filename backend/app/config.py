"""Configuración del backend. Lee las variables del archivo .env."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Configuracion(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Conexión a PostgreSQL (Supabase, Session pooler)
    db_host: str = "localhost"
    db_port: int = 5432
    db_name: str = "postgres"
    db_user: str = "postgres"
    db_password: str = ""

    # Si se define, reemplaza a los datos de arriba (útil para pruebas con SQLite).
    database_url: str | None = None


config = Configuracion()
