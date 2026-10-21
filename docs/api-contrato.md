# Contrato de la API · RF-01 a RF-07

Versión 0.4 · 21 oct 2026 · responsable: Ema

> **Cambios de la 0.4:** detalles de las rutas de indicadores ya programadas (semana 3): campo `sin_datos` siempre presente, período anterior = mes anterior cuando se pide un mes completo, puntos de `dia_semana`, `producto` y `cliente`, y clientes solo para el propietario.
>
> **Cambios de la 0.3:** formatos de archivo aceptados en `POST /cargas` (sin `.xls`). Las rutas de carga y catálogo ya están programadas (semana 2).
>
> **Cambios de la 0.2:** la plantilla, los roles, los estados de la carga y los clientes quedan alineados con el Anexo B, la tabla 12 (historias) y la tabla 18 (diccionario de datos) del documento del Avance 3.

Este documento dice qué recibe y qué devuelve cada ruta del backend. Sofía usa los ejemplos como datos falsos mientras la ruta no exista. Bianca usa los mismos nombres de campos en sus funciones de validación e indicadores. **Si una ruta cambia, se cambia primero aquí y se avisa en la reunión.**

## Reglas generales

- **Dirección base:** `http://127.0.0.1:8000/api` en local. La dirección publicada se define en la semana 4.
- **Formato:** todo va y viene en JSON, menos la subida del archivo (`multipart/form-data`) y la descarga de la plantilla (CSV).
- **Nombres:** en español, en minúscula y con guion bajo (`ticket_promedio`). Las fechas van como `AAAA-MM-DD`, los montos en pesos como número sin formato (`125000.5`) y los porcentajes como número de 0 a 100.
- **Sesión:** las rutas marcadas con 🔒 necesitan el encabezado `Authorization: Bearer <token>`. El token se obtiene al registrarse o al iniciar sesión y dura 8 horas.
- **Aislamiento entre comercios:** el backend saca el comercio del token. El frontend **nunca** envía `comercio_id`. Pedir algo de otro comercio responde `404`, como si no existiera.
- **Roles (tabla 18):** `propietario` (dueño del comercio, puede todo) y `encargado` (puede cargar ventas, pero no administra usuarios ni ve clientes, como pide la HU-02). El rol `administrador` de la tabla 18 queda para el equipo y no se usa en Proyecto I. Las rutas solo para el propietario están marcadas con 👑.
- **Errores:** siempre con esta forma, y el `mensaje` se puede mostrar tal cual en pantalla:

```json
{ "error": "credenciales_invalidas", "mensaje": "El correo o la contraseña no son correctos." }
```

| Código | Cuándo |
|---|---|
| 400 | Datos con formato incorrecto |
| 401 | No hay token o venció; volver a P01 |
| 403 | El rol no tiene permiso |
| 404 | No existe o es de otro comercio |
| 409 | Ya existe (por ejemplo, un correo repetido) |
| 422 | El archivo no se puede leer como CSV o Excel |

## Resumen de rutas

| # | Método y ruta | Pantalla | RF | Semana |
|---|---|---|---|---|
| 1 | `POST /auth/registro` | P01 | RF-01 | 1 |
| 2 | `POST /auth/login` | P01 | RF-01 | 1 |
| 3 | 🔒 `GET /auth/yo` | todas (menú) | RF-01 | 1 |
| 4 | 🔒👑 `GET /usuarios` | P14 | RF-01 | 1 |
| 5 | 🔒👑 `POST /usuarios` | P14 | RF-01 | 1 |
| 6 | 🔒👑 `PATCH /usuarios/{id}` | P14 | RF-01 | 1 |
| 7 | `GET /cargas/plantilla` | P03, P13 | RF-02 | 2 |
| 8 | 🔒 `POST /cargas` | P03 → P04 | RF-02, RF-04 | 2 |
| 9 | 🔒 `GET /cargas` | P03 (historial) | RF-02 | 2 |
| 10 | 🔒 `GET /cargas/{id}` | P04 | RF-02, RF-04 | 2 |
| 11 | 🔒 `POST /cargas/{id}/confirmar` | P04 → P05 | RF-02, RF-03 | 2 |
| 12 | 🔒 `DELETE /cargas/{id}` | P04 | RF-02 | 2 |
| 13 | 🔒 `GET /catalogo/categorias` | P06 (filtros) | RF-03 | 2 |
| 14 | 🔒 `GET /catalogo/productos` | P05, P07 | RF-03 | 2 |
| 15 | 🔒👑 `GET /catalogo/clientes` | P06 (filtros) | RF-03 | 2 |
| 16 | 🔒 `GET /indicadores/resumen` | P02, P06 | RF-06 | 3 |
| 17 | 🔒 `GET /indicadores/ventas` | P02, P06 | RF-05 | 3 |
| 18 | 🔒 `GET /indicadores/abc` | P07 | RF-07 | 4 |

---

## RF-01 · Usuarios y acceso

### 1. `POST /auth/registro`

Crea el comercio y su primer usuario, que queda como propietario. Responde ya con sesión iniciada.

Recibe:

```json
{
  "comercio": "Tienda Doña Marta",
  "ciudad": "Cartagena",
  "nombre": "Marta Pérez",
  "correo": "marta@ejemplo.com",
  "contrasena": "minimo8caracteres"
}
```

Devuelve `201`:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "usuario": {
    "id": 1,
    "nombre": "Marta Pérez",
    "correo": "marta@ejemplo.com",
    "rol": "propietario",
    "comercio": { "id": 1, "nombre": "Tienda Doña Marta", "ciudad": "Cartagena" }
  }
}
```

Errores: `409 correo_registrado`, `400 contrasena_corta` (menos de 8 caracteres).

### 2. `POST /auth/login`

Recibe:

```json
{ "correo": "marta@ejemplo.com", "contrasena": "minimo8caracteres" }
```

Devuelve `200` con la misma forma que el registro (`token` + `usuario`).

Errores: `401 credenciales_invalidas` (el mensaje no dice si falló el correo o la contraseña) y `403 usuario_inactivo`.

### 3. 🔒 `GET /auth/yo`

Devuelve el usuario de la sesión, con la misma forma que `usuario` de arriba. El frontend lo llama al abrir la app para saber si el token sigue sirviendo y para mostrar el nombre del comercio en el menú.

### 4. 🔒👑 `GET /usuarios`

Lista las personas del comercio (P14 · Mi negocio).

```json
[
  { "id": 1, "nombre": "Marta Pérez", "correo": "marta@ejemplo.com", "rol": "propietario", "activo": true },
  { "id": 2, "nombre": "Luis Gómez", "correo": "luis@ejemplo.com", "rol": "encargado", "activo": true }
]
```

### 5. 🔒👑 `POST /usuarios`

Agrega a una persona como encargado. La contraseña temporal se la entrega el propietario; en Proyecto I no se envían correos.

Recibe:

```json
{ "nombre": "Luis Gómez", "correo": "luis@ejemplo.com", "contrasena_temporal": "cambiar123" }
```

Devuelve `201` con el usuario creado (misma forma que un elemento de la lista). Error: `409 correo_registrado`.

### 6. 🔒👑 `PATCH /usuarios/{id}`

Activa o desactiva a un encargado. El propietario no se puede desactivar a sí mismo (`400 no_permitido`).

Recibe `{ "activo": false }` y devuelve el usuario actualizado.

---

## RF-02, RF-03 y RF-04 · Carga de ventas y catálogo

### La plantilla de ventas (Anexo B, tabla 5)

| Columna | Obligatoria | Tipo | Ejemplo |
|---|---|---|---|
| `fecha` | Sí | Fecha `AAAA-MM-DD` | `2026-09-14` |
| `id_ticket` | Sí | Texto | `F-00231` |
| `codigo_producto` | Sí | Texto | `ARZ-500` |
| `nombre_producto` | Sí | Texto | `Arroz Diana 500 g` |
| `categoria` | Sí | Texto | `Granos` |
| `cantidad` | Sí | Número mayor que 0 | `2` |
| `precio_unitario` | Sí | Número mayor que 0, en pesos | `3200` |
| `descuento` | No | Número mayor o igual a 0, en pesos | `0` |
| `id_cliente` | No | Texto seudonimizado (nunca nombre ni cédula) | `C-014` |
| `medio_pago` | No | `efectivo`, `tarjeta`, `transferencia` o `credito` (fiado) | `efectivo` |

- Una fila es un producto dentro de un ticket. Si un ticket tiene tres productos, son tres filas con el mismo `id_ticket` y la misma `fecha`.
- En la base de datos, el ticket se guarda en `venta` y cada fila en `detalle_venta` (tabla 18).
- **Columnas de más:** se aceptan y se ignoran, y la respuesta dice cuáles fueron (HU-04).
- **Datos mínimos recomendados:** 6 meses de histórico para tendencias y ABC.

### 7. `GET /cargas/plantilla?formato=csv`

Descarga la plantilla con los encabezados del Anexo B y tres filas de ejemplo (HU-03). `formato` puede ser `csv` (por defecto) o `xlsx`. No necesita sesión, para que la guía (P13) la pueda ofrecer.

### 8. 🔒 `POST /cargas`

Sube el archivo y lo revisa. **No guarda las ventas todavía**: deja la carga en estado `recibida` (si no hay errores) o `con_errores`, para que la persona los vea en P04 y decida.

Recibe `multipart/form-data` con el campo `archivo` (`.csv` o `.xlsx`, máximo 5 MB). El CSV puede venir separado por comas o por punto y coma, y los encabezados se aceptan con tildes o mayúsculas («Categoría» = `categoria`). Un `.xls` antiguo responde `422 formato_no_soportado` con la indicación de guardarlo como `.xlsx`.

Devuelve `201`:

```json
{
  "id": 12,
  "nombre_archivo": "ventas_septiembre.xlsx",
  "estado": "con_errores",
  "creada_en": "2026-10-26T15:42:10-05:00",
  "filas_totales": 1250,
  "filas_validas": 1238,
  "filas_con_error": 12,
  "columnas_ignoradas": ["vendedor", "caja"],
  "periodo": { "desde": "2026-09-01", "hasta": "2026-09-30" },
  "errores": [
    {
      "fila": 37,
      "columna": "cantidad",
      "valor": "-2",
      "mensaje": "La cantidad debe ser mayor que cero.",
      "sugerencia": "Revisa si fue una devolución; las devoluciones no se cargan en esta versión."
    },
    {
      "fila": 15,
      "columna": "fecha",
      "valor": "31/02/2026",
      "mensaje": "Fila 15: la fecha 31/02/2026 no existe.",
      "sugerencia": "Escríbala como AAAA-MM-DD."
    }
  ]
}
```

- `fila` cuenta como en Excel: la fila 1 son los encabezados, así que la primera venta es la fila 2.
- Los textos de `mensaje` y `sugerencia` los define Bianca en sus reglas de calidad (RF-04).
- Si faltan columnas obligatorias, el archivo entero se rechaza (estado `rechazada`) con `422 columnas_faltantes` y `"faltan": ["fecha", "cantidad"]`.

### 9. 🔒 `GET /cargas`

Historial de cargas del comercio, de la más reciente a la más antigua (P03). Cada elemento tiene la misma forma que la respuesta anterior, pero sin `errores`. El campo `estado` puede ser `recibida`, `con_errores`, `validada` o `rechazada` (tabla 18).

### 10. 🔒 `GET /cargas/{id}`

Detalle de una carga con todos sus errores (misma forma que la respuesta de `POST /cargas`). Sirve para volver a P04 sin subir el archivo otra vez.

### 11. 🔒 `POST /cargas/{id}/confirmar`

Guarda **solo las filas válidas**, crea en el catálogo los productos, categorías y clientes nuevos (HU-06), y deja la carga como `validada` (P05). Recibe un cuerpo vacío.

Devuelve `200`:

```json
{
  "id": 12,
  "estado": "validada",
  "ventas_guardadas": 1238,
  "filas_descartadas": 12,
  "periodo": { "desde": "2026-09-01", "hasta": "2026-09-30" },
  "total_vendido": 18452300,
  "catalogo_nuevo": {
    "productos": [
      { "codigo": "GAL-200", "nombre": "Galletas Festival 200 g", "categoria": "Snacks" }
    ],
    "categorias": ["Snacks"],
    "clientes": 3
  }
}
```

Error: `409 carga_ya_validada`. Si un ticket ya existía (mismo `id_ticket` y `fecha` en el comercio), sus filas no se duplican: se cuentan en `filas_descartadas`.

### 12. 🔒 `DELETE /cargas/{id}`

Descarta una carga `recibida` o `con_errores` sin guardar nada y la deja como `rechazada`. Devuelve `204`. Error: `409 carga_ya_validada`.

### 13 a 15. 🔒 Catálogo

`GET /catalogo/categorias`:

```json
[ { "id": 3, "nombre": "Granos", "productos": 18 } ]
```

`GET /catalogo/productos?categoria_id=3&buscar=arroz`:

```json
[ { "id": 41, "codigo": "ARZ-500", "nombre": "Arroz Diana 500 g", "categoria": { "id": 3, "nombre": "Granos" } } ]
```

`GET /catalogo/clientes?buscar=C-01` (👑, solo el propietario; los clientes van seudonimizados):

```json
[ { "id": 7, "codigo": "C-014" } ]
```

Los filtros (`categoria_id`, `buscar`) son opcionales.

---

## RF-05, RF-06 y RF-07 · Tablero, indicadores y ABC

Estas tres rutas aceptan los mismos filtros, todos opcionales:

| Filtro | Ejemplo | Si no se envía |
|---|---|---|
| `desde`, `hasta` | `2026-09-01` | Últimos 30 días con ventas |
| `categoria_id` | `3` | Todas |
| `cliente_id` | `7` | Todos |

Los cálculos están en `backend/app/servicios/indicadores.py` (pandas); Bianca puede mejorarlos sin cambiar lo que reciben y devuelven. El backend siempre filtra por el comercio del token. Todas las respuestas traen `sin_datos`: si el comercio todavía no tiene ventas, responden `200` con `"sin_datos": true` y la pantalla muestra una invitación a cargar el primer archivo.

El filtro `cliente_id` y `agrupar=cliente` son solo para el propietario: el encargado recibe `403 sin_permiso` (HU-02).

### 16. 🔒 `GET /indicadores/resumen`

Tarjetas de P02 y P06 (RF-06). El campo `frase` es la explicación en lenguaje de negocio (RNF-01).

```json
{
  "sin_datos": false,
  "periodo": { "desde": "2026-09-01", "hasta": "2026-09-30" },
  "periodo_anterior": { "desde": "2026-08-01", "hasta": "2026-08-31" },
  "ventas_totales": { "valor": 18452300, "frase": "En septiembre vendiste $18,5 millones." },
  "transacciones": { "valor": 1430, "frase": "Hiciste 1.430 ventas." },
  "ticket_promedio": { "valor": 12904, "frase": "En promedio, cada cliente gastó $12.904." },
  "crecimiento": { "valor": 8.4, "frase": "Vendiste 8,4 % más que en agosto." },
  "concentracion": {
    "valor": 62.5,
    "top_productos": 10,
    "frase": "Tus 10 productos más vendidos explican el 62,5 % de tus ventas."
  }
}
```

- **Período anterior:** si se pide un mes completo, es el mes calendario anterior; si no, el mismo número de días justo antes (y la frase dice «que los 30 días anteriores»).
- `crecimiento.valor` es `null` si no hay ventas en el período anterior.
- `concentracion.top_productos` es 10, o menos si el comercio vendió menos productos en el período.

### 17. 🔒 `GET /indicadores/ventas?agrupar=semana`

Series para los gráficos de P02 y P06 (RF-05). `agrupar` puede ser `dia`, `semana`, `mes`, `dia_semana`, `categoria`, `producto` o `cliente`. Con `producto` y `cliente` se puede enviar `limite` (por defecto 10).

```json
{
  "sin_datos": false,
  "agrupar": "semana",
  "periodo": { "desde": "2026-09-01", "hasta": "2026-09-30" },
  "puntos": [
    { "etiqueta": "1–7 sep", "inicio": "2026-09-01", "ventas": 4120500, "transacciones": 318 },
    { "etiqueta": "8–14 sep", "inicio": "2026-09-08", "ventas": 4388000, "transacciones": 341 }
  ]
}
```

- Las semanas son bloques de 7 días contados desde `desde` (1–7 sep, 8–14 sep…); los días y las semanas sin ventas salen con 0.
- Con `agrupar=categoria`, `producto` o `cliente`, cada punto trae `id` en lugar de `inicio` y van de mayor a menor venta; por ejemplo, `{ "etiqueta": "Granos", "id": 3, "ventas": 5210000, "transacciones": 802 }`. En `cliente`, la etiqueta es el código seudonimizado.
- Con `agrupar=dia_semana` salen siempre 7 puntos, de lunes a domingo, con `orden` (1 a 7) en lugar de `inicio`.

### 18. 🔒 `GET /indicadores/abc`

Tabla de P07 (RF-07). Criterio: aporte a las ventas en pesos. A hasta el 80 % acumulado, B hasta el 95 % y C el resto.

```json
{
  "criterio": "ventas",
  "cortes": { "A": 80, "B": 95 },
  "resumen": [
    { "grupo": "A", "productos": 12, "porcentaje_ventas": 79.6, "consejo": "Nunca dejes que se agoten: son los que sostienen tu negocio." },
    { "grupo": "B", "productos": 21, "porcentaje_ventas": 15.1, "consejo": "Revísalos cada semana." },
    { "grupo": "C", "productos": 64, "porcentaje_ventas": 5.3, "consejo": "Piensa si vale la pena seguir pidiéndolos." }
  ],
  "productos": [
    { "id": 41, "codigo": "ARZ-500", "nombre": "Arroz Diana 500 g", "categoria": "Granos", "ventas": 1840000, "porcentaje": 9.97, "porcentaje_acumulado": 9.97, "grupo": "A" }
  ]
}
```

---

## Pendientes de acordar en la reunión

1. Confirmar los cortes del ABC (80/95) y el número de productos de la concentración (10).
2. Confirmar el período por defecto del tablero (últimos 30 días con ventas).
3. Confirmar qué ve el encargado en Proyecto I: el plan dice que carga archivos; falta decidir si ve el tablero.
4. Sofía: revisar que cada pantalla tenga los campos que necesita; si falta algo, se agrega aquí antes de programarlo.
