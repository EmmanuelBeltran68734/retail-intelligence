# Entregables de Bianca — Retail Intelligence (O1–O4)

> Datos para pruebas sintéticos. No confundir los escenarios de ejemplo con observaciones de comerciantes reales.

## O2. Regla de agotamiento y tres casos reproducibles

La falta de ventas **no confirma** un agotamiento. Para confirmar agotamiento, se necesita un conteo de existencias **posterior a la última venta** que indique **0 unidades**. Si existe un conteo posterior positivo, se clasifica **con existencias**. Si no existe un conteo útil, solo puede reportarse **posible agotamiento**.

Para validar la regla se añaden **1.200 filas de ventas en octubre de 2026** (`datos/ventas_octubre_escenarios_O2.csv`), con tickets nuevos que no coinciden con las 7.200 ventas originales. Los tres productos de interés dejan de venderse el 10 de octubre; los otros productos siguen vendiéndose hasta el 31 de octubre.

| Estado esperado | Producto | Última venta | Conteo | Interpretación |
|---|---|---|---|---|
| Confirmado | YOG-1L · Yogur 1 L | 10/10/2026 | 25/10/2026: **0** | Agotamiento confirmado |
| Con existencias | GAS-15 · Gaseosa 1,5 L | 10/10/2026 | 25/10/2026: **12** | No está agotado |
| Posible | DET-1K · Detergente 1 kg | 10/10/2026 | Sin conteo | Requiere verificación |

El CSV `datos/inventario_octubre_escenarios_O2.csv` contiene los dos conteos del 25 de octubre; el detergente no tiene conteo. **Para reproducirlo**, primero hay que guardar las ventas originales de abril a septiembre, después cargar y guardar las ventas nuevas de octubre, y finalmente cargar los dos conteos en el mismo comercio. No cargar dos archivos distintos de octubre con tickets que se solapen. Verificar la visualización de los tres casos en la app: es una expectativa diseñada, no una ejecución ya observada.

## O4. Regla del modelo por categoría

El backend compara el **MAE** de Holt-Winters con el método base (promedio de las cuatro semanas previas), separando las últimas cuatro semanas para evaluación. Para cada categoría elige **Holt-Winters si su MAE es estrictamente menor**; si el promedio es igual o mejor, escoge el método base. Cuando la serie no tiene suficiente historia se omite el pronóstico y se informa al usuario. La elección corresponde a cada serie y no se impone un único modelo para todas las categorías.

### Clasificación de confianza

- **Alta:** MAPE del método seleccionado ≤ 15 %.
- **Media:** MAPE > 15 % y ≤ 25 %.
- **Baja:** MAPE > 25 % o no disponible.

La confianza es una etiqueta operativa basada en errores históricos; no representa una probabilidad de cumplimiento.

## O1. Lift entre productos

Cada `id_venta` se trata como una transacción; cada `id_producto` se cuenta una sola vez dentro del ticket. Para un par A y B:

- **Soporte** = número de tickets con A y B / total de tickets.
- **Confianza A → B** = tickets con A y B / tickets con A.
- **Lift** = soporte / (probabilidad de A × probabilidad de B).

Si lift > 1, la coocurrencia supera lo esperable bajo independencia; si ≈ 1, es similar a lo esperado; si < 1, es menor. No demuestra causalidad. Se creó un servicio `asociaciones.py` con **seis pruebas unitarias aprobadas**; la integración del endpoint y las pruebas completas deben confirmarse con el PR de lift antes de declararlo integrado.

## O3. Evaluación oficial del pronóstico

Datos sintéticos, entrenamiento abril–agosto de 2026, evaluación cuatro semanas completas de septiembre (1 al 28). Se utiliza una sola tabla oficial:

| Categoría | MAE Holt-Winters | MAPE Holt-Winters | MAE base | MAPE base | Mejor por MAE |
|---|---:|---:|---:|---:|---|
| TOTAL | 337.388,72 | **6,73 %** | 375.550,00 | 7,82 % | Holt-Winters |
| Aseo | 133.450,97 | 20,67 % | 81.000,00 | 11,92 % | Base |
| Bebidas | 175.826,55 | 24,11 % | 148.700,00 | 20,95 % | Base |
| Enlatados | 100.533,53 | 22,17 % | 141.450,00 | 31,01 % | Holt-Winters |
| Granos | 102.465,52 | 13,21 % | 101.362,50 | 12,59 % | Base |
| Lácteos | 113.963,31 | 10,24 % | 87.162,50 | 9,04 % | Base |
| Panadería | 191.791,97 | 41,68 % | 166.225,00 | 31,64 % | Base |
| Snacks | 53.369,69 | 15,25 % | 60.162,50 | 17,94 % | Holt-Winters |

El MAPE oficial total es **6,73 %** y no 6,8 %; es 1,09 puntos porcentuales inferior al 7,82 % del método base.

## Ejemplo de Marta (ilustrativo)

Marta, administradora hipotética de un minimercado, observa que el yogur dejó de venderse. Si luego se cuenta y hay cero unidades, el sistema puede marcar **agotamiento confirmado**. Cuando la gaseosa deja de venderse pero se cuentan 12 unidades, se marca **con existencias**. El detergente dejó de venderse y no hay conteo; el sistema debe decir **posible**, no confirmado. El caso es narrativo y no representa una entrevista efectivamente realizada.

## Entrevistas y SUS

Se prepararon cinco perfiles modelo de comercios (tienda de barrio, papelería, panadería, ferretería y minimercado), con 14 respuestas por perfil. Son **escenarios hipotéticos**. El ejercicio SUS de cinco cuestionarios simulados obtuvo: P01 67,5; P02 82,5; P03 80; P04 75; P05 72,5; promedio **75,5**, superior al referente 68, pero **no valida empíricamente** la meta de usabilidad sin aplicación real a participantes. El informe completo de Bianca contiene la descripción detallada de los perfiles y preguntas.

## Verificación final solicitada

1. Cargar en la aplicación los dos CSV de octubre y guardar captura de los tres estados de inventario.
2. Ejecutar pruebas backend y, para lift, comprobar el endpoint antes de fusionar el PR.
3. Integrar estas reglas y métricas en el documento final del equipo, con etiquetas claras para los ejemplos simulados.
