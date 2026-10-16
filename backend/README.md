# backend

API en FastAPI (Ema). Aquí van la app, los modelos de la base de datos (SQLAlchemy), las migraciones (Alembic) y las pruebas (pytest).

## Cómo correrlo en tu computador (Windows, PowerShell)

Desde la carpeta `backend`:

```
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

Abre `.env` y pon la contraseña de la base de datos de Supabase. Después:

```
uvicorn app.main:app --reload
```

Abre en el navegador:

- http://127.0.0.1:8000/salud → el servidor funciona.
- http://127.0.0.1:8000/salud/db → la conexión con Supabase funciona.
- http://127.0.0.1:8000/docs → documentación automática de todas las rutas.

Cada vez que abras una terminal nueva, entra a `backend` y activa el entorno con `.venv\Scripts\Activate.ps1` antes de correr el servidor.
