# Contrato de la API · RF-01 a RF-07

Versión 0.1 · 16 oct 2026 · responsable: Ema

Este documento dice qué recibe y qué devuelve cada ruta del backend. Sofía usa los ejemplos como datos falsos mientras la ruta no exista. Bianca usa los mismos nombres de campos en sus funciones de validación e indicadores. **Si una ruta cambia, se cambia primero aquí y se avisa en la reunión.**

## Reglas generales

- **Dirección base:** `http://127.0.0.1:8000/api` en local. La dirección publicada se define en la semana 4.
- **Formato:** todo va y viene en JSON, menos la subida del archivo (`multipart/form-data`) y la descarga de la plantilla (CSV).
- **Nombres:** en español, en minúscula y con guion bajo (`ticket_promedio`). Las fechas van como `AAAA-MM-DD`, los montos en pesos como número sin formato (`125000.5`) y los porcentajes como número de 0 a 100.
- **Sesión:** las rutas marcadas con 🔒 necesitan el encabezado `Authorization: Bearer <token>`. El token se obtiene al registrarse o al iniciar sesión y dura 8 horas.
- **Aislamiento entre comercios:** el backend saca el comercio del token. El frontend **nunca** envía `comercio_id`. Pedir algo de otro comercio responde `404`, como si no existiera.
- **Roles:** `administrador` (dueño del comercio, puede todo) y `encargado` (puede cargar ventas y ver el tablero, pero no administrar usuarios). Las rutas solo para administrador están marcadas con 👑.
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
| 15 | 🔒 `GET /catalogo/clientes` | P06 (filtros) | RF-03 | 2 |
| 16 | 🔒 `GET /indicadores/resumen` | P02, P06 | RF-06 | 3 |
| 17 | 🔒 `GET /indicadores/ventas` | P02, P06 | RF-05 | 3 |
| 18 | 🔒 `GET /indicadores/abc` | P07 | RF-07 | 4 |

---

## RF-01 · Usuarios y acceso

### 1. `POST /auth/registro`

Crea el comercio y su primer usuario, que queda como administrador. Responde ya con sesión iniciada.

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
    "rol": "administrador",
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
  { "id": 1, "nombre": "Marta Pérez", "correo": "marta@ejemplo.com", "rol": "administrador", "activo": true },
  { "id": 2, "nombre": "Luis Gómez", "correo": "luis@ejemplo.com", "rol": "encargado", "activo": true }
]
```

### 5. 🔒👑 `POST /usuarios`

Agrega a una persona como encargado. La contraseña temporal se la entrega el administrador; en Proyecto I no se envían correos.

Recibe:

```json
{ "nombre": "Luis Gómez", "correo": "luis@ejemplo.com", "contrasena_temporal": "cambiar123" }
```

Devuelve `201` con el usuario creado (misma forma que un elemento de la lista). Error: `409 correo_registrado`.

### 6. 🔒👑 `PATCH /usuarios/{id}`

Activa o desactiva a un encargado. Un administrador no se puede desactivar a sí mismo (`400 no_permitido`).

Recibe `{ "activo": false }` y devuelve el usuario actualizado.

---

## RF-02, RF-03 y RF-04 · Carga de ventas y catálogo

### La plantilla de ventas

> ⚠️ **Por confirmar con el Anexo B del documento.** Estos son los nombres propuestos. Si el Anexo B dice otra cosa, manda el Anexo B y se corrige aquí y en el archivo de prueba de Bianca.

| Columna | Obligatoria | Tipo | Ejemplo |
|---|---|---|---|
| `fecha` | Sí | Fecha `AAAA-MM-DD` (también se acepta `DD/MM/AAAA`) | `2026-09-14` |
| `numero_ticket` | Sí | Texto | `F-00231` |
| `codigo_producto` | Sí | Texto | `ARZ-500` |
| `nombre_producto` | Sí | Texto | `Arroz Diana 500 g` |
| `categoria` | Sí | Texto | `Granos` |
| `cantidad` | Sí | Número mayor que 0 | `2` |
| `precio_unitario` | Sí | Número mayor o igual a 0, en pesos | `3200` |
| `codigo_cliente` | No | Texto | `C-014` |
| `nombre_cliente` | No | Texto | `Juan Ruiz` |

Una fila es la venta de un producto. Si un ticket tiene tres productos, son tres filas con el mismo `numero_ticket`.

### 7. `GET /cargas/plantilla?formato=csv`

Descarga la plantilla vacía con los encabezados y dos filas de ejemplo. `formato` puede ser `csv` (por defecto) o `xlsx`. No necesita sesión, para que la guía (P13) la pueda ofrecer.

### 8. 🔒 `POST /cargas`

Sube el archivo y lo revisa. **No guarda las ventas todavía**: deja la carga en estado `revisada` para que la persona vea los errores en P04 y decida.

Recibe `multipart/form-data` con el campo `archivo` (`.csv`, `.xlsx` o `.xls`, máximo 5 MB).

Devuelve `201`:

```json
{
  "id": 12,
  "nombre_archivo": "ventas_septiembre.xlsx",
  "estado": "revisada",
  "creada_en": "2026-10-26T15:42:10-05:00",
  "filas_totales": 1250,
  "filas_validas": 1238,
  "filas_con_error": 12,
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
      "fila": 152,
      "columna": "fecha",
      "valor": "31/09/2026",
      "mensaje": "Esa fecha no existe.",
      "sugerencia": "Septiembre tiene 30 días."
    }
  ]
}
```

- `fila` cuenta como en Excel: la fila 1 son los encabezados, así que la primera venta es la fila 2.
- Los textos de `mensaje` y `sugerencia` los define Bianca en sus reglas de calidad (RF-04).
- Si faltan columnas obligatorias, el archivo entero se rechaza con `422 columnas_faltantes` y `"faltan": ["fecha", "cantidad"]`.

### 9. 🔒 `GET /cargas`

Historial de cargas del comercio, de la más reciente a la más antigua (P03). Cada elemento tiene la misma forma que la respuesta anterior, pero sin `errores`. El campo `estado` puede ser `revisada`, `confirmada` o `descartada`.

### 10. 🔒 `GET /cargas/{id}`

Detalle de una carga con todos sus errores (misma forma que la respuesta de `POST /cargas`). Sirve para volver a P04 sin subir el archivo otra vez.

### 11. 🔒 `POST /cargas/{id}/confirmar`

Guarda **solo las filas válidas**, crea en el catálogo los productos, categorías y clientes nuevos, y deja la carga como `confirmada` (P05). Recibe un cuerpo vacío.

Devuelve `200`:

```json
{
  "id": 12,
  "estado": "confirmada",
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

Error: `409 carga_ya_confirmada`. Si una venta ya existía (mismo ticket, producto y fecha), no se duplica: se cuenta en `filas_descartadas`.

### 12. 🔒 `DELETE /cargas/{id}`

Descarta una carga `revisada` sin guardar nada. Devuelve `204`. Error: `409 carga_ya_confirmada`.

### 13 a 15. 🔒 Catálogo

`GET /catalogo/categorias`:

```json
[ { "id": 3, "nombre": "Granos", "productos": 18 } ]
```

`GET /catalogo/productos?categoria_id=3&buscar=arroz`:

```json
[ { "id": 41, "codigo": "ARZ-500", "nombre": "Arroz Diana 500 g", "categoria": { "id": 3, "nombre": "Granos" } } ]
```

`GET /catalogo/clientes?buscar=juan`:

```json
[ { "id": 7, "codigo": "C-014", "nombre": "Juan Ruiz" } ]
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

Los cálculos los hacen las funciones de Bianca (pandas). El backend solo filtra por comercio, se las pasa y entrega el resultado. Si el comercio todavía no tiene ventas, las tres rutas responden `200` con `"sin_datos": true` y la pantalla muestra una invitación a cargar el primer archivo.

### 16. 🔒 `GET /indicadores/resumen`

Tarjetas de P02 y P06 (RF-06). El campo `frase` es la explicación en lenguaje de negocio (RNF-01).

```json
{
  "periodo": { "desde": "2026-09-01", "hasta": "2026-09-30" },
  "periodo_anterior": { "desde": "2026-08-02", "hasta": "2026-08-31" },
  "ventas_totales": { "valor": 18452300, "frase": "Este mes vendiste $18,5 millones." },
  "transacciones": { "valor": 1430, "frase": "Hiciste 1.430 ventas." },
  "ticket_promedio": { "valor": 12904, "frase": "En promedio, cada cliente gastó $12.904." },
  "crecimiento": { "valor": 8.4, "frase": "Vendiste 8,4 % más que el mes anterior." },
  "concentracion": {
    "valor": 62.5,
    "top_productos": 10,
    "frase": "Tus 10 productos más vendidos explican el 62,5 % de tus ventas."
  }
}
```

`crecimiento.valor` es `null` si no hay datos del período anterior.

### 17. 🔒 `GET /indicadores/ventas?agrupar=semana`

Series para los gráficos de P02 y P06 (RF-05). `agrupar` puede ser `dia`, `semana`, `mes`, `dia_semana`, `categoria`, `producto` o `cliente`. Con `producto` y `cliente` se puede enviar `limite` (por defecto 10).

```json
{
  "agrupar": "semana",
  "puntos": [
    { "etiqueta": "1–7 sep", "inicio": "2026-09-01", "ventas": 4120500, "transacciones": 318 },
    { "etiqueta": "8–14 sep", "inicio": "2026-09-08", "ventas": 4388000, "transacciones": 341 }
  ]
}
```

Con `agrupar=categoria`, cada punto trae `id` en lugar de `inicio`; por ejemplo, `{ "etiqueta": "Granos", "id": 3, "ventas": 5210000, "transacciones": 802 }`.

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

1. Confirmar las columnas de la plantilla contra el Anexo B.
2. Confirmar los cortes del ABC (80/95) y el número de productos de la concentración (10).
3. Confirmar el período por defecto del tablero (últimos 30 días con ventas).
4. Sofía: revisar que cada pantalla tenga los campos que necesita; si falta algo, se agrega aquí antes de programarlo.
