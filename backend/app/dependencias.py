"""Piezas que comparten las rutas: el usuario de la sesión y el control por rol."""
import uuid

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.db import obtener_sesion
from app.errores import ErrorApi
from app.modelos import Usuario
from app.seguridad import leer_token

_bearer = HTTPBearer(auto_error=False)


def usuario_actual(
    credenciales: HTTPAuthorizationCredentials | None = Depends(_bearer),
    sesion: Session = Depends(obtener_sesion),
) -> Usuario:
    """Saca el usuario del token. El comercio sale de aquí, nunca de lo que mande el frontend."""
    if credenciales is None:
        raise ErrorApi(401, "sin_sesion", "Inicia sesión para continuar.")
    id_usuario = leer_token(credenciales.credentials)
    usuario = sesion.get(Usuario, uuid.UUID(id_usuario)) if id_usuario else None
    if usuario is None or not usuario.activo:
        raise ErrorApi(401, "sesion_vencida", "Tu sesión terminó. Vuelve a iniciar sesión.")
    return usuario


def solo_propietario(usuario: Usuario = Depends(usuario_actual)) -> Usuario:
    if usuario.rol.nombre != "propietario":
        raise ErrorApi(403, "sin_permiso", "Solo el propietario del comercio puede hacer esto.")
    return usuario
