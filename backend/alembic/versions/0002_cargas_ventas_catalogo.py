"""Semana 2 (HU-03 a HU-06): carga, error_carga, categoria, producto, cliente, venta y detalle_venta.

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-20
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0002'
down_revision: Union[str, None] = '0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('categoria',
    sa.Column('id_categoria', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('id_comercio', sa.Uuid(), nullable=False),
    sa.Column('nombre', sa.String(length=80), nullable=False),
    sa.ForeignKeyConstraint(['id_comercio'], ['comercio.id_comercio'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id_categoria'),
    sa.UniqueConstraint('id_comercio', 'nombre')
    )
    op.create_index(op.f('ix_categoria_id_comercio'), 'categoria', ['id_comercio'], unique=False)
    op.create_table('cliente',
    sa.Column('id_cliente', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('id_comercio', sa.Uuid(), nullable=False),
    sa.Column('codigo_seudonimo', sa.String(length=64), nullable=False),
    sa.Column('segmento', sa.String(length=40), nullable=True),
    sa.ForeignKeyConstraint(['id_comercio'], ['comercio.id_comercio'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id_cliente'),
    sa.UniqueConstraint('id_comercio', 'codigo_seudonimo')
    )
    op.create_index(op.f('ix_cliente_id_comercio'), 'cliente', ['id_comercio'], unique=False)
    op.create_table('carga',
    sa.Column('id_carga', sa.Uuid(), nullable=False),
    sa.Column('id_comercio', sa.Uuid(), nullable=False),
    sa.Column('id_usuario', sa.Uuid(), nullable=False),
    sa.Column('nombre_archivo', sa.String(length=255), nullable=False),
    sa.Column('estado', sa.String(length=20), nullable=False),
    sa.Column('filas_total', sa.Integer(), nullable=False),
    sa.Column('filas_validas', sa.Integer(), nullable=False),
    sa.Column('filas_con_error', sa.Integer(), nullable=False),
    sa.Column('columnas_ignoradas', sa.JSON(), nullable=False),
    sa.Column('periodo_desde', sa.Date(), nullable=True),
    sa.Column('periodo_hasta', sa.Date(), nullable=True),
    sa.Column('filas_pendientes', sa.JSON(), nullable=True),
    sa.Column('fecha_carga', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    sa.Column('confirmada_en', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['id_comercio'], ['comercio.id_comercio'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['id_usuario'], ['usuario.id_usuario'], ),
    sa.PrimaryKeyConstraint('id_carga')
    )
    op.create_index(op.f('ix_carga_id_comercio'), 'carga', ['id_comercio'], unique=False)
    op.create_table('producto',
    sa.Column('id_producto', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('id_comercio', sa.Uuid(), nullable=False),
    sa.Column('id_categoria', sa.Integer(), nullable=False),
    sa.Column('codigo', sa.String(length=60), nullable=False),
    sa.Column('nombre', sa.String(length=160), nullable=False),
    sa.Column('clase_abc', sa.String(length=1), nullable=True),
    sa.ForeignKeyConstraint(['id_categoria'], ['categoria.id_categoria'], ),
    sa.ForeignKeyConstraint(['id_comercio'], ['comercio.id_comercio'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id_producto'),
    sa.UniqueConstraint('id_comercio', 'codigo')
    )
    op.create_index(op.f('ix_producto_id_comercio'), 'producto', ['id_comercio'], unique=False)
    op.create_table('error_carga',
    sa.Column('id_error', sa.BigInteger().with_variant(sa.Integer(), 'sqlite'), autoincrement=True, nullable=False),
    sa.Column('id_carga', sa.Uuid(), nullable=False),
    sa.Column('fila', sa.Integer(), nullable=False),
    sa.Column('campo', sa.String(length=60), nullable=False),
    sa.Column('tipo_error', sa.String(length=40), nullable=False),
    sa.Column('valor', sa.Text(), nullable=True),
    sa.Column('mensaje', sa.Text(), nullable=False),
    sa.Column('sugerencia', sa.Text(), nullable=True),
    sa.ForeignKeyConstraint(['id_carga'], ['carga.id_carga'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id_error')
    )
    op.create_index(op.f('ix_error_carga_id_carga'), 'error_carga', ['id_carga'], unique=False)
    op.create_table('venta',
    sa.Column('id_venta', sa.BigInteger().with_variant(sa.Integer(), 'sqlite'), autoincrement=True, nullable=False),
    sa.Column('id_comercio', sa.Uuid(), nullable=False),
    sa.Column('id_carga', sa.Uuid(), nullable=False),
    sa.Column('id_cliente', sa.Integer(), nullable=True),
    sa.Column('id_ticket', sa.String(length=60), nullable=False),
    sa.Column('fecha', sa.Date(), nullable=False),
    sa.Column('medio_pago', sa.String(length=20), nullable=True),
    sa.ForeignKeyConstraint(['id_carga'], ['carga.id_carga'], ),
    sa.ForeignKeyConstraint(['id_cliente'], ['cliente.id_cliente'], ),
    sa.ForeignKeyConstraint(['id_comercio'], ['comercio.id_comercio'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id_venta'),
    sa.UniqueConstraint('id_comercio', 'id_ticket', 'fecha')
    )
    op.create_index(op.f('ix_venta_fecha'), 'venta', ['fecha'], unique=False)
    op.create_index(op.f('ix_venta_id_comercio'), 'venta', ['id_comercio'], unique=False)
    op.create_table('detalle_venta',
    sa.Column('id_detalle', sa.BigInteger().with_variant(sa.Integer(), 'sqlite'), autoincrement=True, nullable=False),
    sa.Column('id_venta', sa.BigInteger().with_variant(sa.Integer(), 'sqlite'), nullable=False),
    sa.Column('id_producto', sa.Integer(), nullable=False),
    sa.Column('cantidad', sa.Numeric(precision=12, scale=3, asdecimal=False), nullable=False),
    sa.Column('precio_unitario', sa.Numeric(precision=12, scale=2, asdecimal=False), nullable=False),
    sa.Column('descuento', sa.Numeric(precision=12, scale=2, asdecimal=False), nullable=False),
    sa.ForeignKeyConstraint(['id_producto'], ['producto.id_producto'], ),
    sa.ForeignKeyConstraint(['id_venta'], ['venta.id_venta'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id_detalle')
    )
    op.create_index(op.f('ix_detalle_venta_id_venta'), 'detalle_venta', ['id_venta'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_detalle_venta_id_venta'), table_name='detalle_venta')
    op.drop_table('detalle_venta')
    op.drop_index(op.f('ix_venta_id_comercio'), table_name='venta')
    op.drop_index(op.f('ix_venta_fecha'), table_name='venta')
    op.drop_table('venta')
    op.drop_index(op.f('ix_error_carga_id_carga'), table_name='error_carga')
    op.drop_table('error_carga')
    op.drop_index(op.f('ix_producto_id_comercio'), table_name='producto')
    op.drop_table('producto')
    op.drop_index(op.f('ix_carga_id_comercio'), table_name='carga')
    op.drop_table('carga')
    op.drop_index(op.f('ix_cliente_id_comercio'), table_name='cliente')
    op.drop_table('cliente')
    op.drop_index(op.f('ix_categoria_id_comercio'), table_name='categoria')
    op.drop_table('categoria')
