# Historias de usuario (tabla 12 del Avance 3)

Este es el product backlog del proyecto. Cada historia es una tarjeta (issue) en el tablero **Plan de entrega · Proyecto I**.

- **HU-01 a HU-08** se construyen en este corte (Proyecto I, RF-01 a RF-07).
- **HU-09 a HU-15** quedan en el tablero con la etiqueta `Proyecto II`; sus pantallas (P08 a P12) solo existen como prototipo.
- Cada historia de Proyecto I tiene una lista de tareas por frente: pantalla (Sofía), ruta de la API (Ema) y cálculo o validación (Bianca).
- Una historia pasa a **Hecho** cuando cumple su criterio de aceptación, tiene pruebas y otra integrante revisó el pull request.

## Resumen

| ID | Historia (corta) | RF | Pantallas | Prioridad | Semana | Etiquetas |
|---|---|---|---|---|---|---|
| HU-01 | Crear cuenta e iniciar sesión | RF-01 | P01 | Debe | 1 | Proyecto I, semana 1 |
| HU-02 | Invitar a un encargado | RF-01 | P14 | Debe | 1 | Proyecto I, semana 1 |
| HU-03 | Descargar la plantilla con ejemplo | RF-02 | P03, P13 | Debe | 2 | Proyecto I, semana 2 |
| HU-04 | Subir el Excel del sistema de caja | RF-02 | P03 | Debe | 2 | Proyecto I, semana 2 |
| HU-05 | Errores explicados en palabras sencillas | RF-02, RF-04 | P04 | Debe | 2 | Proyecto I, semana 2 |
| HU-06 | Productos nuevos al catálogo automáticamente | RF-03 | P05 | Debe | 2 | Proyecto I, semana 2 |
| HU-07 | Resumen del mes y comparación | RF-05, RF-06 | P02, P06 | Debe | 3 | Proyecto I, semana 3 |
| HU-08 | Productos clave (ABC) | RF-07 | P07 | Debe | 4 | Proyecto I, semana 4 |
| HU-09 | Aviso de producto en caída | RF-08, RF-13 | P08 | Debería | — | Proyecto II |
| HU-10 | Pronóstico por categoría con rango | RF-09, RF-15 | P09 | Debe | — | Proyecto II |
| HU-11 | Días con ventas fuera de lo normal | RF-10 | P08 | Debería | — | Proyecto II |
| HU-12 | Productos que se compran juntos | RF-11 | P11 | Debería | — | Proyecto II |
| HU-13 | Grupos de clientes | RF-12 | P10 | Debería | — | Proyecto II |
| HU-14 | Preguntas en lenguaje natural | RF-14 | P12 | Podría | — | Proyecto II |
| HU-15 | Versión y error de cada modelo | RF-15 | P09 | Debe | — | Proyecto II |

---

## Tarjetas listas para copiar

Para cada tarjeta: el **título** va en el título del issue y el **cuerpo** en la descripción.

### HU-01 · Crear cuenta e iniciar sesión

**Título:** `HU-01 · Crear mi cuenta e iniciar sesión`

```
**Historia:** Como Marta, quiero crear mi cuenta con mi correo y una contraseña, para que solo yo vea las ventas de mi tienda.

**Criterio de aceptación:** Dado que me registro con datos válidos, cuando inicio sesión, entonces solo veo la información de mi comercio.

**RF:** RF-01 · **Pantalla:** P01 · **Prioridad:** Debe · **Semana:** 1

**Tareas**
- [ ] Ema: tablas comercio, rol y usuario; rutas `POST /auth/registro`, `POST /auth/login` y `GET /auth/yo` (ver docs/api-contrato.md).
- [ ] Ema: prueba de que un usuario no puede ver datos de otro comercio.
- [ ] Sofía: pantalla P01 (registro e inicio de sesión) con redirección al inicio.
```

### HU-02 · Invitar a un encargado

**Título:** `HU-02 · Invitar a un encargado que solo cargue ventas`

```
**Historia:** Como Andrés, quiero invitar a un empleado con permiso solo para cargar ventas, para repartir el trabajo sin mostrarle todos los indicadores.

**Criterio de aceptación:** Dado un usuario con rol «encargado», cuando entra, entonces puede cargar archivos, pero no ve hallazgos ni clientes.

**RF:** RF-01 · **Pantalla:** P14 · **Prioridad:** Debe · **Semana:** 1

**Tareas**
- [ ] Ema: rutas `GET /usuarios`, `POST /usuarios` y `PATCH /usuarios/{id}`, solo para el propietario.
- [ ] Ema: prueba de que el encargado recibe 403 en las rutas del propietario.
- [ ] Sofía: pantalla P14 (lista de usuarios e invitación) y menú que oculta lo que el encargado no puede ver.
```

### HU-03 · Descargar la plantilla

**Título:** `HU-03 · Descargar la plantilla con un ejemplo lleno`

```
**Historia:** Como Marta, quiero descargar una plantilla con un ejemplo lleno, para saber qué datos tengo que poner.

**Criterio de aceptación:** Dado que abro «Cargar ventas», cuando pulso «Descargar plantilla», entonces recibo un archivo con las columnas del Anexo B y tres filas de ejemplo.

**RF:** RF-02 · **Pantallas:** P03, P13 · **Prioridad:** Debe · **Semana:** 2

**Tareas**
- [ ] Bianca: plantilla CSV y Excel con las columnas del Anexo B y tres filas de ejemplo.
- [ ] Ema: ruta `GET /cargas/plantilla`.
- [ ] Sofía: botón de descarga en P03 y página P13 (guía de la plantilla).
```

### HU-04 · Subir el archivo de ventas

**Título:** `HU-04 · Subir el Excel que exporto de mi sistema de caja`

```
**Historia:** Como Andrés, quiero subir el Excel que exporto de mi sistema de caja, para no digitar las ventas otra vez.

**Criterio de aceptación:** Dado un archivo con las columnas mínimas, cuando lo subo, entonces el sistema lo acepta aunque tenga columnas de más y me dice cuáles ignoró.

**RF:** RF-02 · **Pantalla:** P03 · **Prioridad:** Debe · **Semana:** 2

**Tareas**
- [ ] Bianca: lectura de CSV y Excel, y detección de columnas faltantes y de más (pandas + pandera).
- [ ] Ema: tablas carga y error_carga; rutas `POST /cargas`, `GET /cargas` y `GET /cargas/{id}`.
- [ ] Sofía: pantalla P03 (subir archivo e historial de cargas).
```

### HU-05 · Errores explicados

**Título:** `HU-05 · Ver en palabras sencillas qué está mal en mi archivo`

```
**Historia:** Como Marta, quiero que el sistema me diga en palabras sencillas qué está mal en mi archivo, para corregirlo sola.

**Criterio de aceptación:** Dado un archivo con una fecha imposible en la fila 15, cuando lo subo, entonces veo: «Fila 15: la fecha 31/02/2026 no existe. Escríbala como AAAA-MM-DD».

**RF:** RF-02, RF-04 · **Pantalla:** P04 · **Prioridad:** Debe · **Semana:** 2

**Tareas**
- [ ] Bianca: reglas de calidad (duplicados, faltantes, tipos, rangos) con mensaje y sugerencia en español; pruebas con archivos con errores sembrados.
- [ ] Ema: guardar los errores en error_carga y devolverlos en `POST /cargas`; ruta `DELETE /cargas/{id}`.
- [ ] Sofía: pantalla P04 (lista de errores por fila y campo, guardar solo las filas buenas o descartar).
```

### HU-06 · Catálogo automático

**Título:** `HU-06 · Agregar solos al catálogo los productos nuevos`

```
**Historia:** Como Andrés, quiero que los productos nuevos se agreguen solos al catálogo, para no crearlos uno por uno.

**Criterio de aceptación:** Dado un código de producto que no existe, cuando confirmo la carga, entonces se crea con su nombre y categoría y aparece en el resumen.

**RF:** RF-03 · **Pantalla:** P05 · **Prioridad:** Debe · **Semana:** 2

**Tareas**
- [ ] Ema: tablas categoria, producto, cliente, venta y detalle_venta; ruta `POST /cargas/{id}/confirmar`; rutas del catálogo.
- [ ] Ema: prueba de que un ticket repetido no se duplica.
- [ ] Sofía: pantalla P05 (resumen de lo guardado y productos nuevos).
```

### HU-07 · Resumen del mes

**Título:** `HU-07 · Ver cuánto vendí este mes y si voy mejor que el pasado`

```
**Historia:** Como Marta, quiero ver al abrir la aplicación cuánto vendí este mes y si voy mejor o peor que el mes pasado, para saber cómo va el negocio sin hacer cuentas.

**Criterio de aceptación:** Dado que tengo al menos dos meses de ventas, cuando abro «Inicio», entonces veo el total, el ticket promedio y la variación con una frase como «Vendiste 8 % más que en agosto».

**RF:** RF-05, RF-06 · **Pantallas:** P02, P06 · **Prioridad:** Debe · **Semana:** 3

**Tareas**
- [ ] Bianca: funciones de ventas por período, categoría y cliente, ticket promedio, crecimiento y concentración, cada una con su frase.
- [ ] Ema: rutas `GET /indicadores/resumen` y `GET /indicadores/ventas` con filtros.
- [ ] Sofía: pantallas P02 (inicio) y P06 (tablero con gráficos y filtros).
```

### HU-08 · Productos clave (ABC)

**Título:** `HU-08 · Saber qué productos me dejan la mayor parte de las ventas`

```
**Historia:** Como Andrés, quiero saber cuáles productos me dejan la mayor parte de las ventas, para no quedarme sin ellos.

**Criterio de aceptación:** Dado un período, cuando abro «Productos clave», entonces veo los grupos A, B y C y el porcentaje acumulado de ventas.

**RF:** RF-07 · **Pantalla:** P07 · **Prioridad:** Debe · **Semana:** 4

**Tareas**
- [ ] Bianca: clasificación ABC con porcentaje acumulado y consejo por grupo.
- [ ] Ema: ruta `GET /indicadores/abc`; publicación en Render y Supabase; pruebas en GitHub Actions.
- [ ] Sofía: pantalla P07 (tabla ABC) y ajustes para pantallas pequeñas.
```

### HU-09 a HU-15 · Proyecto II

Estas siete van al tablero con la etiqueta `Proyecto II`, sin tareas ni semana. Se detallan cuando empiece Proyecto II.

| Título | Cuerpo |
|---|---|
| `HU-09 · Aviso cuando un producto lleve semanas cayendo` | Como Andrés, quiero un aviso cuando un producto lleve varias semanas cayendo, para reaccionar a tiempo. **Criterio:** Dado un producto con tendencia negativa, cuando abro «Hallazgos», entonces veo una tarjeta con la caída, el período y el nivel de confianza. RF-08, RF-13 · P08 · Debería. |
| `HU-10 · Ver cuánto podría vender la próxima semana` | Como Marta, quiero ver cuánto podría vender la próxima semana en cada categoría, con un rango, para hacer el pedido con más tranquilidad. **Criterio:** Dado al menos 6 meses de histórico, cuando abro el pronóstico, entonces veo un valor esperado, un rango y una advertencia si el error histórico es alto. RF-09, RF-15 · P09 · Debe. |
| `HU-11 · Saber qué días tuvieron ventas fuera de lo normal` | Como Andrés, quiero saber qué días tuvieron ventas fuera de lo normal, para distinguir un error de digitación de algo que pasó en la tienda. **Criterio:** Dado un día con ventas muy por encima o por debajo de lo esperado, cuando reviso los hallazgos, entonces veo la alerta con el motivo y puedo marcarla como «error» o «real». RF-10 · P08 · Debería. |
| `HU-12 · Saber qué productos se compran juntos` | Como Andrés, quiero saber qué productos suelen comprarse juntos, para armar combos o ubicarlos cerca. **Criterio:** Dado que mis ventas tienen número de ticket, cuando abro «Van juntos», entonces veo pares de productos con una frase como «6 de cada 10 clientes que llevan pan también llevan leche». RF-11 · P11 · Debería. |
| `HU-13 · Ver grupos de clientes` | Como Andrés, quiero ver grupos de clientes, como los fieles o los que dejaron de venir, para decidir a quién cuidar. **Criterio:** Dado que registro id_cliente, cuando abro «Clientes», entonces veo segmentos con nombre, número de clientes y qué los caracteriza. RF-12 · P10 · Debería. |
| `HU-14 · Hacer preguntas y recibir una respuesta corta` | Como Marta, quiero preguntar «¿qué fue lo que más vendí ayer?» y recibir una respuesta corta, para no tener que buscar en los gráficos. **Criterio:** Dada una pregunta dentro del catálogo de indicadores, cuando la envío, entonces recibo el dato correcto y el período usado; si está fuera del alcance, el sistema me lo dice y me sugiere preguntas válidas. RF-14 · P12 · Podría. |
| `HU-15 · Guardar la versión y el error de cada modelo` | Como integrante del equipo, quiero que cada resultado guarde qué versión del modelo lo produjo y con qué error, para poder explicarlo y compararlo. **Criterio:** Dado un pronóstico generado, cuando consulto su detalle, entonces veo la versión del modelo, la fecha de entrenamiento y el MAPE de validación. RF-15 · P09 · Debe. |
