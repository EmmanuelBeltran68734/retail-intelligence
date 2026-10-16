# Retail Intelligence

Plataforma para que los pequeños comercios entiendan sus ventas: cargan un archivo con sus ventas, el sistema lo revisa y les muestra un tablero con indicadores y la clasificación ABC de sus productos.

Proyecto de Ingeniería I · tercer corte (oct.–nov. 2026). Alcance: RF-01 a RF-07.

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
