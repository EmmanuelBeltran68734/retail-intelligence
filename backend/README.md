# backend

API en FastAPI (Ema): modelos de la base de datos (SQLAlchemy), migraciones (Alembic) y pruebas (pytest).

## Primera vez (Windows, PowerShell), desde la carpeta `backend`

```
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

Abre `.env` y pon la contraseña de tu PostgreSQL local (base `retail_dev`).

## Cada vez que trabajes

```
.venv\Scripts\Activate.ps1
alembic upgrade head          # deja tus tablas al día con el repositorio
uvicorn app.main:app --reload
```

- http://127.0.0.1:8000/docs → todas las rutas, y se pueden probar ahí mismo.
- http://127.0.0.1:8000/salud/db → la conexión con la base funciona.

## Pruebas

```
pytest
```

Usan una base SQLite en memoria: no necesitan PostgreSQL ni internet.

## Reglas de la base de datos

- Solo Ema crea migraciones (`alembic revision --autogenerate -m "..."`). Sofía y Bianca solo ejecutan `alembic upgrade head`.
- Nunca se cambian las tablas a mano en pgAdmin: todo cambio va por una migración.
