"""Lo que reciben y devuelven las rutas (docs/api-contrato.md)."""
import uuid

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegistroEntrada(BaseModel):
    comercio: str = Field(min_length=2, max_length=120)
    ciudad: str | None = Field(default=None, max_length=80)
    nombre: str = Field(min_length=2, max_length=120)
    correo: EmailStr
    contrasena: str


class LoginEntrada(BaseModel):
    correo: EmailStr
    contrasena: str


class ComercioSalida(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID = Field(validation_alias="id_comercio")
    nombre: str
    ciudad: str | None


class UsuarioSalida(BaseModel):
    id: uuid.UUID
    nombre: str
    correo: str
    rol: str
    activo: bool
    comercio: ComercioSalida


class SesionSalida(BaseModel):
    token: str
    usuario: UsuarioSalida
