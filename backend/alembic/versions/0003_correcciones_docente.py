"""Correcciones del docente: huella de archivo (O5), trazabilidad del pronóstico (O3) e inventario (O2).

Revision ID: 0003
Revises: 0002
Create Date: 2026-11-12
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0003'
down_revision: Union[str, None] = '0002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

IdGrande = sa.BigInteger().with_variant(sa.Integer(), 'sqlite')


def upgrade() -> None:
    op.add_column('carga', sa.Column('huella', sa.String(length=64), nullable=True))
    op.create_index(op.f('ix_carga_huella'), 'carga', ['huella'], unique=False)

    op.create_table('version_modelo',
    sa.Column('id_version', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('nombre', sa.String(length=60), nullable=False),
    sa.Column('version', sa.String(length=20), nullable=False),
    sa.Column('parametros', sa.JSON(), nullable=False),
    sa.Column('creado_en', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    sa.PrimaryKeyConstraint('id_version'),
    sa.UniqueConstraint('nombre', 'version')
    )
    op.create_table('ejecucion_modelo',
    sa.Column('id_ejecucion', IdGrande, autoincrement=True, nullable=False),
    sa.Column('id_comercio', sa.Uuid(), nullable=False),
    sa.Column('id_version', sa.Integer(), nullable=False),
    sa.Column('huella_datos', sa.String(length=64), nullable=False),
    sa.Column('desde', sa.Date(), nullable=False),
    sa.Column('hasta', sa.Date(), nullable=False),
    sa.Column('semanas', sa.SmallInteger(), nullable=False),
    sa.Column('id_categoria', sa.Integer(), nullable=True),
    sa.Column('cargas', sa.JSON(), nullable=False),
    sa.Column('metricas', sa.JSON(), nullable=False),
    sa.Column('resultado', sa.JSON(), nullable=False),
    sa.Column('creado_en', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    sa.ForeignKeyConstraint(['id_comercio'], ['comercio.id_comercio'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['id_version'], ['version_modelo.id_version'], ),
    sa.PrimaryKeyConstraint('id_ejecucion')
    )
    op.create_index(op.f('ix_ejecucion_modelo_id_comercio'), 'ejecucion_modelo', ['id_comercio'], unique=False)
    op.create_index(op.f('ix_ejecucion_modelo_huella_datos'), 'ejecucion_modelo', ['huella_datos'], unique=False)

    op.create_table('inventario',
    sa.Column('id_inventario', IdGrande, autoincrement=True, nullable=False),
    sa.Column('id_comercio', sa.Uuid(), nullable=False),
    sa.Column('id_producto', sa.Integer(), nullable=False),
    sa.Column('fecha', sa.Date(), nullable=False),
    sa.Column('existencias', sa.Numeric(precision=12, scale=3, asdecimal=False), nullable=False),
    sa.Column('cargado_en', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    sa.ForeignKeyConstraint(['id_comercio'], ['comercio.id_comercio'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['id_producto'], ['producto.id_producto'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id_inventario'),
    sa.UniqueConstraint('id_producto', 'fecha')
    )
    op.create_index(op.f('ix_inventario_id_comercio'), 'inventario', ['id_comercio'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_inventario_id_comercio'), table_name='inventario')
    op.drop_table('inventario')
    op.drop_index(op.f('ix_ejecucion_modelo_huella_datos'), table_name='ejecucion_modelo')
    op.drop_index(op.f('ix_ejecucion_modelo_id_comercio'), table_name='ejecucion_modelo')
    op.drop_table('ejecucion_modelo')
    op.drop_table('version_modelo')
    op.drop_index(op.f('ix_carga_huella'), table_name='carga')
    op.drop_column('carga', 'huella')
