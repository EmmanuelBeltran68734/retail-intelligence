
# Evaluación del pronóstico de ventas

## Objetivo

Evaluamos un modelo Holt-Winters para pronosticar las
ventas semanales de Retail Intelligence, tanto para el
comercio completo como para cada categoría de productos.

El propósito fue comprobar su precisión y compararlo con
un método base sencillo, antes de incorporarlo a la
plataforma.

## Datos y metodología

Utilizamos el archivo `ventas_prueba.csv`, que contiene
7.200 registros de ventas generados para las pruebas
del proyecto.

- Entrenamiento: abril a agosto de 2026.
- Evaluación: 1 al 28 de septiembre de 2026.
- Frecuencia: semanal, con cierre los lunes.
- Horizonte: cuatro semanas.
- Modelo: Holt-Winters con tendencia aditiva y
  estacionalidad aditiva de cuatro semanas.
- Método base: promedio de las últimas cuatro semanas
  del entrenamiento, repetido para cada semana futura.

Calculamos el importe de cada registro mediante:

importe = cantidad × precio_unitario - descuento

Para evaluar las predicciones utilizamos MAE (error
absoluto medio, expresado en pesos colombianos) y MAPE
(error porcentual absoluto medio).

## Resultados

| Categoría | MAE Holt-Winters | MAPE Holt-Winters | MAE base | MAPE base | Mejor método |
|---|---:|---:|---:|---:|---|
| TOTAL | 337388.72 | 6.73 % | 375550.00 | 7.82 % | Holt-Winters |
| Aseo | 133450.97 | 20.67 % | 81000.00 | 11.92 % | Método base |
| Bebidas | 175826.55 | 24.11 % | 148700.00 | 20.95 % | Método base |
| Enlatados | 100533.53 | 22.17 % | 141450.00 | 31.01 % | Holt-Winters |
| Granos | 102465.52 | 13.21 % | 101362.50 | 12.59 % | Método base |
| Lácteos | 113963.31 | 10.24 % | 87162.50 | 9.04 % | Método base |
| Panadería | 191791.97 | 41.68 % | 166225.00 | 31.64 % | Método base |
| Snacks | 53369.69 | 15.25 % | 60162.50 | 17.94 % | Holt-Winters |

## Interpretación

Para las ventas totales, Holt-Winters obtuvo un MAPE
de 6,73 %, frente al 7,82 % del método base. Esto
representa una mejora de 1,09 puntos porcentuales
en el error porcentual medio.

Sin embargo, Holt-Winters no fue superior en todas
las categorías. Obtuvo mejores resultados en el total,
Enlatados y Snacks, mientras que el promedio de las
últimas cuatro semanas fue más preciso en las otras
cinco categorías.

Panadería presentó el mayor error porcentual entre
los pronósticos Holt-Winters, con un MAPE de 41,68 %.
Por tanto, debemos evitar presentar todos los
pronósticos como igualmente confiables.

## Supuestos y limitaciones

1. Utilizamos datos sintéticos, por lo que los
   resultados no demuestran todavía el desempeño
   del modelo en comercios reales.

2. Suponemos inicialmente un ciclo estacional de
   cuatro semanas. Este patrón debe contrastarse
   con datos históricos de mayor duración.

3. El entrenamiento abarca cinco meses y la
   evaluación únicamente cuatro semanas. Se
   necesitan más períodos de prueba para determinar
   si el desempeño se mantiene en el tiempo.

4. Excluimos el 29 y 30 de septiembre de la
   evaluación porque pertenecen a una semana
   incompleta.

5. Cuando un pronóstico monetario es negativo,
   la función lo ajusta a cero.

6. El MAPE no está definido si alguna venta real
   semanal es cero. En ese caso, nuestra evaluación
   lo registra como no disponible.

7. Los pronósticos por categoría se calculan de
   forma independiente del total. Por eso, su suma
   no necesariamente coincide con el pronóstico
   general del comercio.

## Conclusión

En esta primera evaluación, Holt-Winters mostró
resultados favorables para las ventas totales,
pero el método base fue más preciso en varias
categorías.

Por ello, consideramos necesario conservar ambos
métodos como referencia y continuar evaluándolos
con otros períodos y datos reales antes de definir
su uso definitivo en Retail Intelligence.

## Evidencias generadas

- `metricas_pronostico.csv`: MAE y MAPE por categoría.
- `comparacion_semanal.csv`: ventas observadas y
  predicciones de ambos métodos.
- `grafica_septiembre_total.png`: comparación gráfica
  del total semanal de septiembre.

También desarrollamos tres pruebas automatizadas
en `backend/tests/test_pronostico.py`, las cuales
finalizaron correctamente.
