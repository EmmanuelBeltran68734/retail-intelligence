"""RF-01 · HU-01: registro, inicio de sesión y usuario de la sesión."""
from fastapi import APIRouter, Depends, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import obtener_sesion
from app.dependencias import usuario_actual
from app.errores import ErrorApi
from app.esquemas import ComercioSalida, LoginEntrada, RegistroEntrada, SesionSalida, UsuarioSalida
from app.modelos import Comercio, Usuario
from app.seguridad import cifrar_contrasena, crear_token, verificar_contrasena

router = APIRouter(prefix="/api/auth", tags=["autenticación"])

ROL_PROPIETARIO = 1


def a_salida(usuario: Usuario) -> UsuarioSalida:
    return UsuarioSalida(
        id=usuario.id_usuario,
        nombre=usuario.nombre,
        correo=usuario.correo,
        rol=usuario.rol.nombre,
        activo=usuario.activo,
        comercio=ComercioSalida.model_validate(usuario.comercio),
    )


@router.post("/registro", status_code=status.HTTP_201_CREATED, response_model=SesionSalida)
def registro(datos: RegistroEntrada, sesion: Session = Depends(obtener_sesion)):
    """Crea el comercio y su primer usuario, que queda como propietario."""
    if len(datos.contrasena) < 8:
        raise ErrorApi(400, "contrasena_corta", "La contraseña debe tener al menos 8 caracteres.")
    correo = datos.correo.lower()
    if sesion.scalar(select(Usuario).where(func.lower(Usuario.correo) == correo)):
        raise ErrorApi(409, "correo_registrado", "Ya existe una cuenta con ese correo.")

    comercio = Comercio(nombre=datos.comercio.strip(), ciudad=datos.ciudad)
    usuario = Usuario(
        comercio=comercio,
        id_rol=ROL_PROPIETARIO,
        nombre=datos.nombre.strip(),
        correo=correo,
        hash_contrasena=cifrar_contrasena(datos.contrasena),
    )
    sesion.add_all([comercio, usuario])
    sesion.commit()
    sesion.refresh(usuario)
    return SesionSalida(token=crear_token(str(usuario.id_usuario)), usuario=a_salida(usuario))


@router.post("/login", response_model=SesionSalida)
def login(datos: LoginEntrada, sesion: Session = Depends(obtener_sesion)):
    usuario = sesion.scalar(select(Usuario).where(func.lower(Usuario.correo) == datos.correo.lower()))
    # Mismo mensaje si falla el correo o la contraseña, para no revelar qué correos existen.
    if usuario is None or not verificar_contrasena(datos.contrasena, usuario.hash_contrasena):
        raise ErrorApi(401, "credenciales_invalidas", "El correo o la contraseña no son correctos.")
    if not usuario.activo:
        raise ErrorApi(403, "usuario_inactivo", "Tu usuario está desactivado. Habla con el propietario del comercio.")
    return SesionSalida(token=crear_token(str(usuario.id_usuario)), usuario=a_salida(usuario))


@router.get("/yo", response_model=UsuarioSalida)
def yo(usuario: Usuario = Depends(usuario_actual)):
    return a_salida(usuario)
