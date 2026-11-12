"""Tablas de la base de datos (tabla 18 del documento).

Semana 1 (HU-01, HU-02): comercio, rol y usuario.
Semana 2 (HU-03 a HU-06): carga, error_carga, categoria, producto, cliente, venta y detalle_venta.
Correcciones del docente (migración 0003): huella del archivo en carga (O5), version_modelo y
ejecucion_modelo para la trazabilidad del pronóstico (O3) e inventario para confirmar agotamientos (O2).
"""
import uuid
from datetime import date, datetime

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    func,
    true,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Comercio(Base):
    __tablename__ = "comercio"

    id_comercio: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    nombre: Mapped[str] = mapped_column(String(120))
    tipo_comercio: Mapped[str | None] = mapped_column(String(60))
    ciudad: Mapped[str | None] = mapped_column(String(80))
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.current_timestamp())

    usuarios: Mapped[list["Usuario"]] = relationship(back_populates="comercio")


class Rol(Base):
    """Roles fijos: 1 propietario, 2 encargado, 3 administrador (este último es del equipo)."""

    __tablename__ = "rol"

    id_rol: Mapped[int] = mapped_column(SmallInteger, primary_key=True, autoincrement=False)
    nombre: Mapped[str] = mapped_column(String(30), unique=True)


class Usuario(Base):
    __tablename__ = "usuario"

    id_usuario: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    id_comercio: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("comercio.id_comercio", ondelete="CASCADE"), index=True
    )
    id_rol: Mapped[int] = mapped_column(SmallInteger, ForeignKey("rol.id_rol"))
    nombre: Mapped[str] = mapped_column(String(120))
    correo: Mapped[str] = mapped_column(String(254), unique=True)
    hash_contrasena: Mapped[str] = mapped_column(String(255))
    activo: Mapped[bool] = mapped_column(Boolean, server_default=true())
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.current_timestamp())

    comercio: Mapped[Comercio] = relationship(back_populates="usuarios")
    rol: Mapped[Rol] = relationship()


# ---------------------------------------------------------------------------
# Semana 2 · HU-03 a HU-06: carga de ventas y catálogo (tabla 18)
# ---------------------------------------------------------------------------
# BIGSERIAL en PostgreSQL; INTEGER en SQLite (las pruebas), que solo autoincrementa con INTEGER.
IdGrande = BigInteger().with_variant(Integer(), "sqlite")
Dinero = Numeric(12, 2, asdecimal=False)


class Carga(Base):
    """Un archivo subido. Las filas buenas esperan en `filas_pendientes` hasta que se confirma."""

    __tablename__ = "carga"

    id_carga: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    id_comercio: Mapped[uuid.UUID] = mapped_column(ForeignKey("comercio.id_comercio", ondelete="CASCADE"), index=True)
    id_usuario: Mapped[uuid.UUID] = mapped_column(ForeignKey("usuario.id_usuario"))
    nombre_archivo: Mapped[str] = mapped_column(String(255))
    # recibida (sin errores) · con_errores · validada (confirmada) · rechazada
    estado: Mapped[str] = mapped_column(String(20))
    filas_total: Mapped[int] = mapped_column(Integer, default=0)
    filas_validas: Mapped[int] = mapped_column(Integer, default=0)
    filas_con_error: Mapped[int] = mapped_column(Integer, default=0)
    columnas_ignoradas: Mapped[list] = mapped_column(JSON, default=list)
    periodo_desde: Mapped[date | None] = mapped_column(Date)
    periodo_hasta: Mapped[date | None] = mapped_column(Date)
    filas_pendientes: Mapped[list | None] = mapped_column(JSON)
    fecha_carga: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.current_timestamp())
    confirmada_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # SHA-256 del contenido del archivo: el mismo archivo no se acepta dos veces (O5).
    huella: Mapped[str | None] = mapped_column(String(64), index=True)

    errores: Mapped[list["ErrorCarga"]] = relationship(
        back_populates="carga", cascade="all, delete-orphan", order_by="ErrorCarga.id_error"
    )


class ErrorCarga(Base):
    __tablename__ = "error_carga"

    id_error: Mapped[int] = mapped_column(IdGrande, primary_key=True, autoincrement=True)
    id_carga: Mapped[uuid.UUID] = mapped_column(ForeignKey("carga.id_carga", ondelete="CASCADE"), index=True)
    fila: Mapped[int] = mapped_column(Integer)
    campo: Mapped[str] = mapped_column(String(60))
    tipo_error: Mapped[str] = mapped_column(String(40))
    valor: Mapped[str | None] = mapped_column(Text)
    mensaje: Mapped[str] = mapped_column(Text)
    sugerencia: Mapped[str | None] = mapped_column(Text)

    carga: Mapped[Carga] = relationship(back_populates="errores")


class Categoria(Base):
    __tablename__ = "categoria"
    __table_args__ = (UniqueConstraint("id_comercio", "nombre"),)

    id_categoria: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    id_comercio: Mapped[uuid.UUID] = mapped_column(ForeignKey("comercio.id_comercio", ondelete="CASCADE"), index=True)
    nombre: Mapped[str] = mapped_column(String(80))


class Producto(Base):
    __tablename__ = "producto"
    __table_args__ = (UniqueConstraint("id_comercio", "codigo"),)

    id_producto: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    id_comercio: Mapped[uuid.UUID] = mapped_column(ForeignKey("comercio.id_comercio", ondelete="CASCADE"), index=True)
    id_categoria: Mapped[int] = mapped_column(ForeignKey("categoria.id_categoria"))
    codigo: Mapped[str] = mapped_column(String(60))
    nombre: Mapped[str] = mapped_column(String(160))
    clase_abc: Mapped[str | None] = mapped_column(String(1))

    categoria: Mapped[Categoria] = relationship()


class Cliente(Base):
    """Solo se guarda el código seudonimizado: nunca nombre ni cédula (tabla 18)."""

    __tablename__ = "cliente"
    __table_args__ = (UniqueConstraint("id_comercio", "codigo_seudonimo"),)

    id_cliente: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    id_comercio: Mapped[uuid.UUID] = mapped_column(ForeignKey("comercio.id_comercio", ondelete="CASCADE"), index=True)
    codigo_seudonimo: Mapped[str] = mapped_column(String(64))
    segmento: Mapped[str | None] = mapped_column(String(40))


class Venta(Base):
    """Un ticket. Sus productos van en detalle_venta."""

    __tablename__ = "venta"
    __table_args__ = (UniqueConstraint("id_comercio", "id_ticket", "fecha"),)

    id_venta: Mapped[int] = mapped_column(IdGrande, primary_key=True, autoincrement=True)
    id_comercio: Mapped[uuid.UUID] = mapped_column(ForeignKey("comercio.id_comercio", ondelete="CASCADE"), index=True)
    id_carga: Mapped[uuid.UUID] = mapped_column(ForeignKey("carga.id_carga"))
    id_cliente: Mapped[int | None] = mapped_column(ForeignKey("cliente.id_cliente"))
    id_ticket: Mapped[str] = mapped_column(String(60))
    fecha: Mapped[date] = mapped_column(Date, index=True)
    medio_pago: Mapped[str | None] = mapped_column(String(20))

    detalles: Mapped[list["DetalleVenta"]] = relationship(back_populates="venta", cascade="all, delete-orphan")


class DetalleVenta(Base):
    __tablename__ = "detalle_venta"

    id_detalle: Mapped[int] = mapped_column(IdGrande, primary_key=True, autoincrement=True)
    id_venta: Mapped[int] = mapped_column(ForeignKey("venta.id_venta", ondelete="CASCADE"), index=True)
    id_producto: Mapped[int] = mapped_column(ForeignKey("producto.id_producto"))
    cantidad: Mapped[float] = mapped_column(Numeric(12, 3, asdecimal=False))
    precio_unitario: Mapped[float] = mapped_column(Dinero)
    descuento: Mapped[float] = mapped_column(Dinero, default=0)

    venta: Mapped[Venta] = relationship(back_populates="detalles")


# ---------------------------------------------------------------------------
# Migración 0003 · correcciones del docente
# ---------------------------------------------------------------------------
class VersionModelo(Base):
    """Una versión del pronóstico con sus parámetros (O3). Si cambian los parámetros, es otra versión."""

    __tablename__ = "version_modelo"
    __table_args__ = (UniqueConstraint("nombre", "version"),)

    id_version: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(60))
    version: Mapped[str] = mapped_column(String(20))
    parametros: Mapped[dict] = mapped_column(JSON)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.current_timestamp())


class EjecucionModelo(Base):
    """Una corrida del pronóstico: con qué versión, con qué datos (huella) y qué resultado dio (O3)."""

    __tablename__ = "ejecucion_modelo"

    id_ejecucion: Mapped[int] = mapped_column(IdGrande, primary_key=True, autoincrement=True)
    id_comercio: Mapped[uuid.UUID] = mapped_column(ForeignKey("comercio.id_comercio", ondelete="CASCADE"), index=True)
    id_version: Mapped[int] = mapped_column(ForeignKey("version_modelo.id_version"))
    # SHA-256 de las series semanales usadas + la consulta (semanas y categoría).
    huella_datos: Mapped[str] = mapped_column(String(64), index=True)
    desde: Mapped[date] = mapped_column(Date)
    hasta: Mapped[date] = mapped_column(Date)
    semanas: Mapped[int] = mapped_column(SmallInteger)
    id_categoria: Mapped[int | None] = mapped_column(Integer)
    cargas: Mapped[list] = mapped_column(JSON)  # ids de las cargas de origen
    metricas: Mapped[list] = mapped_column(JSON)
    resultado: Mapped[dict] = mapped_column(JSON)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.current_timestamp())

    version_modelo: Mapped[VersionModelo] = relationship()


class Inventario(Base):
    """Conteo de existencias de un producto en una fecha (O2). Sirve para confirmar un agotamiento."""

    __tablename__ = "inventario"
    __table_args__ = (UniqueConstraint("id_producto", "fecha"),)

    id_inventario: Mapped[int] = mapped_column(IdGrande, primary_key=True, autoincrement=True)
    id_comercio: Mapped[uuid.UUID] = mapped_column(ForeignKey("comercio.id_comercio", ondelete="CASCADE"), index=True)
    id_producto: Mapped[int] = mapped_column(ForeignKey("producto.id_producto", ondelete="CASCADE"))
    fecha: Mapped[date] = mapped_column(Date)
    existencias: Mapped[float] = mapped_column(Numeric(12, 3, asdecimal=False))
    cargado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.current_timestamp())
