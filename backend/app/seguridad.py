"""Contraseñas (Argon2 con pwdlib) y tokens de sesión (JWT con PyJWT)."""
from datetime import datetime, timedelta, timezone

import jwt
from pwdlib import PasswordHash

from app.config import config

_hasher = PasswordHash.recommended()
ALGORITMO = "HS256"


def cifrar_contrasena(contrasena: str) -> str:
    return _hasher.hash(contrasena)


def verificar_contrasena(contrasena: str, hash_guardado: str) -> bool:
    return _hasher.verify(contrasena, hash_guardado)


def crear_token(id_usuario: str) -> str:
    ahora = datetime.now(timezone.utc)
    datos = {"sub": id_usuario, "iat": ahora, "exp": ahora + timedelta(minutes=config.token_minutos)}
    return jwt.encode(datos, config.secret_key, algorithm=ALGORITMO)


def leer_token(token: str) -> str | None:
    """Devuelve el id del usuario, o None si el token no sirve o venció."""
    try:
        return jwt.decode(token, config.secret_key, algorithms=[ALGORITMO])["sub"]
    except jwt.PyJWTError:
        return None
