"""Lo que reciben y devuelven las rutas (docs/api-contrato.md)."""
import uuid
from datetime import date, datetime

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


# --- HU-02 · equipo del comercio ---

class MiembroSalida(BaseModel):
    id: uuid.UUID
    nombre: str
    correo: str
    rol: str
    activo: bool


class NuevoEncargadoEntrada(BaseModel):
    nombre: str = Field(min_length=2, max_length=120)
    correo: EmailStr
    contrasena_temporal: str


class CambioActivoEntrada(BaseModel):
    activo: bool


# --- Semana 2 · cargas y catálogo ---

class Periodo(BaseModel):
    desde: date | None
    hasta: date | None


class ErrorFila(BaseModel):
    fila: int
    columna: str
    valor: str | None
    mensaje: str
    sugerencia: str | None


class CargaResumen(BaseModel):
    id: uuid.UUID
    nombre_archivo: str
    estado: str
    creada_en: datetime
    filas_totales: int
    filas_validas: int
    filas_con_error: int
    columnas_ignoradas: list[str]
    periodo: Periodo


class Aviso(BaseModel):
    """Advertencia de la revisión que no impide guardar (O5): tickets ya guardados o fechas que se cruzan."""
    tipo: str
    cantidad: int
    mensaje: str


class CargaDetalle(CargaResumen):
    errores: list[ErrorFila]
    advertencias: list[Aviso] = []


class ProductoNuevo(BaseModel):
    codigo: str
    nombre: str
    categoria: str


class CatalogoNuevo(BaseModel):
    productos: list[ProductoNuevo]
    categorias: list[str]
    clientes: int


class CargaConfirmada(BaseModel):
    id: uuid.UUID
    estado: str
    ventas_guardadas: int
    filas_descartadas: int
    periodo: Periodo
    total_vendido: float
    catalogo_nuevo: CatalogoNuevo


class CategoriaSalida(BaseModel):
    id: int
    nombre: str
    productos: int


class CategoriaCorta(BaseModel):
    id: int
    nombre: str


class ProductoSalida(BaseModel):
    id: int
    codigo: str
    nombre: str
    categoria: CategoriaCorta


class ClienteSalida(BaseModel):
    id: int
    codigo: str
