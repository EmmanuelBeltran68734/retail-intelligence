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
    # "require" para Supabase; "disable" para el PostgreSQL local.
    db_sslmode: str = "require"

    # Firma de los tokens de sesión. En producción se cambia por una clave larga y secreta.
    secret_key: str = "cambiar-esta-clave-en-produccion"
    token_minutos: int = 480  # 8 horas

    # Orígenes del frontend de Sofía (Vite) que pueden llamar a la API desde el navegador.
    # Se aceptan las dos formas de abrir la app en local; se separan con comas.
    cors_origenes: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Si se define, reemplaza a los datos de arriba (útil para pruebas con SQLite).
    database_url: str | None = None


config = Configuracion()
