"""HU-01: tablas comercio, rol y usuario (tabla 18), con los roles iniciales.

Revision ID: 0001
Revises: 
Create Date: 2026-10-19
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('comercio',
    sa.Column('id_comercio', sa.Uuid(), nullable=False),
    sa.Column('nombre', sa.String(length=120), nullable=False),
    sa.Column('tipo_comercio', sa.String(length=60), nullable=True),
    sa.Column('ciudad', sa.String(length=80), nullable=True),
    sa.Column('creado_en', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    sa.PrimaryKeyConstraint('id_comercio')
    )
    op.create_table('rol',
    sa.Column('id_rol', sa.SmallInteger(), autoincrement=False, nullable=False),
    sa.Column('nombre', sa.String(length=30), nullable=False),
    sa.PrimaryKeyConstraint('id_rol'),
    sa.UniqueConstraint('nombre')
    )
    op.create_table('usuario',
    sa.Column('id_usuario', sa.Uuid(), nullable=False),
    sa.Column('id_comercio', sa.Uuid(), nullable=False),
    sa.Column('id_rol', sa.SmallInteger(), nullable=False),
    sa.Column('nombre', sa.String(length=120), nullable=False),
    sa.Column('correo', sa.String(length=254), nullable=False),
    sa.Column('hash_contrasena', sa.String(length=255), nullable=False),
    sa.Column('activo', sa.Boolean(), server_default=sa.text('true'), nullable=False),
    sa.Column('creado_en', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    sa.ForeignKeyConstraint(['id_comercio'], ['comercio.id_comercio'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['id_rol'], ['rol.id_rol'], ),
    sa.PrimaryKeyConstraint('id_usuario'),
    sa.UniqueConstraint('correo')
    )
    op.create_index(op.f('ix_usuario_id_comercio'), 'usuario', ['id_comercio'], unique=False)

    # Roles fijos. El 3 (administrador) es del equipo y no se usa en Proyecto I.
    rol = sa.table('rol', sa.column('id_rol', sa.SmallInteger), sa.column('nombre', sa.String))
    op.bulk_insert(rol, [
        {'id_rol': 1, 'nombre': 'propietario'},
        {'id_rol': 2, 'nombre': 'encargado'},
        {'id_rol': 3, 'nombre': 'administrador'},
    ])


def downgrade() -> None:
    op.drop_index(op.f('ix_usuario_id_comercio'), table_name='usuario')
    op.drop_table('usuario')
    op.drop_table('rol')
    op.drop_table('comercio')
