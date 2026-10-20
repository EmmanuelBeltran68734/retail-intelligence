"""RF-01 · HU-02: el propietario ve a su equipo, agrega encargados y los activa o desactiva."""
import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import obtener_sesion
from app.dependencias import solo_propietario
from app.errores import ErrorApi
from app.esquemas import CambioActivoEntrada, MiembroSalida, NuevoEncargadoEntrada
from app.modelos import Usuario
from app.seguridad import cifrar_contrasena

router = APIRouter(prefix="/api/usuarios", tags=["usuarios del comercio"])

ROL_ENCARGADO = 2


def a_miembro(u: Usuario) -> MiembroSalida:
    return MiembroSalida(id=u.id_usuario, nombre=u.nombre, correo=u.correo, rol=u.rol.nombre, activo=u.activo)


@router.get("", response_model=list[MiembroSalida])
def listar(propietario: Usuario = Depends(solo_propietario), sesion: Session = Depends(obtener_sesion)):
    """Personas del comercio de la sesión (P14 · Mi negocio)."""
    usuarios = sesion.scalars(
        select(Usuario).where(Usuario.id_comercio == propietario.id_comercio).order_by(Usuario.creado_en)
    )
    return [a_miembro(u) for u in usuarios]


@router.post("", status_code=status.HTTP_201_CREATED, response_model=MiembroSalida)
def agregar_encargado(
    datos: NuevoEncargadoEntrada,
    propietario: Usuario = Depends(solo_propietario),
    sesion: Session = Depends(obtener_sesion),
):
    """Crea un encargado en el comercio del propietario. La contraseña temporal se la entrega el propietario."""
    if len(datos.contrasena_temporal) < 8:
        raise ErrorApi(400, "contrasena_corta", "La contraseña temporal debe tener al menos 8 caracteres.")
    correo = datos.correo.lower()
    if sesion.scalar(select(Usuario).where(func.lower(Usuario.correo) == correo)):
        raise ErrorApi(409, "correo_registrado", "Ya existe una cuenta con ese correo.")
    nuevo = Usuario(
        id_comercio=propietario.id_comercio,
        id_rol=ROL_ENCARGADO,
        nombre=datos.nombre.strip(),
        correo=correo,
        hash_contrasena=cifrar_contrasena(datos.contrasena_temporal),
    )
    sesion.add(nuevo)
    sesion.commit()
    sesion.refresh(nuevo)
    return a_miembro(nuevo)


@router.patch("/{id_usuario}", response_model=MiembroSalida)
def cambiar_activo(
    id_usuario: uuid.UUID,
    datos: CambioActivoEntrada,
    propietario: Usuario = Depends(solo_propietario),
    sesion: Session = Depends(obtener_sesion),
):
    """Activa o desactiva a un encargado. Un usuario de otro comercio responde 404, como si no existiera."""
    usuario = sesion.get(Usuario, id_usuario)
    if usuario is None or usuario.id_comercio != propietario.id_comercio:
        raise ErrorApi(404, "no_encontrado", "No encontramos esa persona en tu comercio.")
    if usuario.id_usuario == propietario.id_usuario:
        raise ErrorApi(400, "no_permitido", "No puedes desactivar tu propia cuenta.")
    usuario.activo = datos.activo
    sesion.commit()
    sesion.refresh(usuario)
    return a_miembro(usuario)
