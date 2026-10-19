"""Tablas de la base de datos (tabla 18 del documento).

HU-01 y HU-02 necesitan comercio, rol y usuario. Las demás tablas
(carga, venta, producto...) se agregan en sus propias historias.
"""
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, SmallInteger, String, func, true
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
