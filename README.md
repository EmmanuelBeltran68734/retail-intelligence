# Retail Intelligence

Plataforma para que los pequeños comercios entiendan sus ventas: cargan un archivo con sus ventas, el sistema lo revisa y les muestra un tablero con indicadores y la clasificación ABC de sus productos.

Proyecto de Ingeniería I · tercer corte (oct.–nov. 2026). Alcance: RF-01 a RF-07, más una versión mínima del pronóstico de ventas (RF-09) y las correcciones del docente.

## Estado final (12 nov 2026)

| Parte | Estado |
|---|---|
| Registro, inicio de sesión y encargados (RF-01) | Funciona |
| Plantilla, carga, revisión fila por fila y confirmación de ventas (RF-02 a RF-04) | Funciona; rechaza el mismo archivo subido dos veces y avisa tickets ya guardados |
| Tablero e indicadores con frases (RF-05, RF-06) | Funciona; no calcula el crecimiento contra un período cargado a medias |
| Clasificación ABC (RF-07) | Funciona |
| Pronóstico semanal Holt-Winters con rango y comparación contra un método base (RF-09 mínimo) | Funciona; cada resultado queda guardado con su versión, parámetros y huella de los datos |
| Conteos de existencias y agotamientos con evidencia | Funciona; sin conteo en cero solo se dice «posible agotamiento». Escenarios de prueba: `datos/ventas_octubre_escenarios_O2.csv` + `datos/inventario_octubre_escenarios_O2.csv` |
| Productos que se compran juntos (soporte, confianza y lift) | Ruta lista (`/indicadores/asociaciones`); pantalla P11 pendiente |
| Despliegue en la nube | Pendiente; la demostración se hace en local |

La API tiene 24 rutas (ver `docs/api-contrato.md`) y el backend tiene 81 pruebas automáticas que corren en GitHub Actions en cada pull request.

## Cómo correr la demo en un computador (Windows)

Se necesita Python 3.14, Node 22 o superior y PostgreSQL con una base vacía llamada `retail_dev`.

**1. Backend** (una terminal, en la carpeta `backend`):

```
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

Pon la contraseña de PostgreSQL en `.env`. Luego, cada vez:

```
.venv\Scripts\Activate.ps1
alembic upgrade head
uvicorn app.main:app --reload
```

Comprueba `http://127.0.0.1:8000/salud/db`. La documentación de la API queda en `http://127.0.0.1:8000/docs`.

**2. Frontend** (otra terminal, en la carpeta `frontend`):

```
npm install
```

Crea el archivo `frontend/.env` con estas dos líneas para usar el backend real:

```
VITE_DATOS_FALSOS=false
VITE_API_URL=http://127.0.0.1:8000/api
```

Luego `npm run dev` y abre `http://localhost:5173`.

**3. Datos de prueba:** crea una cuenta en la app, ve a «Cargar ventas», sube `datos/ventas_prueba.csv` (7.200 ventas de abril a septiembre de 2026) y confírmala. Con eso se llenan el tablero, los productos clave y el pronóstico.

Las dos terminales deben quedar abiertas durante toda la demo.

## Pruebas

- Backend: `pytest` en la carpeta `backend` (usa SQLite en memoria; no necesita PostgreSQL).
- Frontend: `npx vitest run` en la carpeta `frontend`.

## Equipo

| Persona | Frente | Carpeta |
|---|---|---|
| Sofía | Frontend y experiencia de usuario (React + Vite) | `frontend/` |
| Ema | Backend, base de datos y despliegue (FastAPI + PostgreSQL) | `backend/` |
| Bianca | Datos, validación, indicadores y ABC (pandas + pandera) | `datos/` |

## Carpetas

- `backend/`: la API en FastAPI, los modelos de la base de datos y sus pruebas.
- `frontend/`: la aplicación web en React + Vite.
- `datos/`: la plantilla de ventas, el archivo de prueba compartido y las funciones de validación e indicadores.
- `docs/`: el contrato de la API, el modelo de datos y las decisiones del equipo.

## Reglas de trabajo

1. Primero el contrato, después el código: cada ruta se describe en `docs/` antes de programarla.
2. Un solo archivo de datos de prueba, en `datos/`.
3. Nadie trabaja directo sobre `main`. Una rama por historia de usuario (`hu-01-inicio-sesion`, por ejemplo) y cada cambio entra por pull request revisado por otra integrante.
4. Reuniones lunes, miércoles y viernes (15 min); integración los viernes.
5. Si no está en GitHub Projects, no existe.
6. «Hecho» significa probado y revisado.
