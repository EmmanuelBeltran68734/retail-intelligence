"""RF-03: catálogo de categorías, productos y clientes del comercio."""
from fastapi import APIRouter, Depends
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.db import obtener_sesion
from app.dependencias import solo_propietario, usuario_actual
from app.esquemas import CategoriaCorta, CategoriaSalida, ClienteSalida, ProductoSalida
from app.modelos import Categoria, Cliente, Producto, Usuario

router = APIRouter(prefix="/api/catalogo", tags=["catálogo"])


@router.get("/categorias", response_model=list[CategoriaSalida])
def categorias(usuario: Usuario = Depends(usuario_actual), sesion: Session = Depends(obtener_sesion)):
    filas = sesion.execute(
        select(Categoria, func.count(Producto.id_producto))
        .outerjoin(Producto, Producto.id_categoria == Categoria.id_categoria)
        .where(Categoria.id_comercio == usuario.id_comercio)
        .group_by(Categoria.id_categoria)
        .order_by(Categoria.nombre)
    )
    return [CategoriaSalida(id=c.id_categoria, nombre=c.nombre, productos=n) for c, n in filas]


@router.get("/productos", response_model=list[ProductoSalida])
def productos(
    categoria_id: int | None = None,
    buscar: str | None = None,
    usuario: Usuario = Depends(usuario_actual),
    sesion: Session = Depends(obtener_sesion),
):
    consulta = select(Producto).where(Producto.id_comercio == usuario.id_comercio)
    if categoria_id is not None:
        consulta = consulta.where(Producto.id_categoria == categoria_id)
    if buscar:
        patron = f"%{buscar.lower()}%"
        consulta = consulta.where(or_(func.lower(Producto.nombre).like(patron), func.lower(Producto.codigo).like(patron)))
    return [
        ProductoSalida(id=p.id_producto, codigo=p.codigo, nombre=p.nombre,
                       categoria=CategoriaCorta(id=p.categoria.id_categoria, nombre=p.categoria.nombre))
        for p in sesion.scalars(consulta.order_by(Producto.nombre))
    ]


@router.get("/clientes", response_model=list[ClienteSalida])
def clientes(buscar: str | None = None, propietario: Usuario = Depends(solo_propietario),
             sesion: Session = Depends(obtener_sesion)):
    """Solo el propietario (HU-02). Los clientes van seudonimizados: solo su código."""
    consulta = select(Cliente).where(Cliente.id_comercio == propietario.id_comercio)
    if buscar:
        consulta = consulta.where(func.lower(Cliente.codigo_seudonimo).like(f"%{buscar.lower()}%"))
    return [ClienteSalida(id=c.id_cliente, codigo=c.codigo_seudonimo)
            for c in sesion.scalars(consulta.order_by(Cliente.codigo_seudonimo))]
