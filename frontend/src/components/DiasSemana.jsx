import { useState } from 'react'
import { numero, pesos, pesosCortos } from '../formato.js'

const ALTO = 140 // alto de las columnas en px (igual que .columna-dia en Tablero.css)
const CORTO = (t) => t.charAt(0).toUpperCase() + t.slice(1, 3)
const plural = (t) => (t.endsWith('s') ? t : `${t}s`)

// Ventas por día de la semana: columnas con una línea de promedio.
// Cada columna es un botón; al elegirla se ve su detalle debajo.
export default function DiasSemana({ puntos }) {
  const [elegido, setElegido] = useState(null)
  const maximo = Math.max(...puntos.map((p) => p.ventas), 1)
  const promedio = puntos.reduce((s, p) => s + p.ventas, 0) / (puntos.length || 1)
  const mejor = puntos.reduce((a, p) => (p.ventas > a.ventas ? p : a), puntos[0])
  const peor = puntos.reduce((a, p) => (p.ventas < a.ventas ? p : a), puntos[0])
  const vs = (v) => Math.round(((v - promedio) / promedio) * 100)
  const foco = puntos.find((p) => p.orden === elegido)

  return (
    <div className="stack" style={{ gap: 12 }}>
      <p className="sub sin-margen">
        Los <b>{plural(mejor.etiqueta)}</b> vendes {vs(mejor.ventas)} % más que un día promedio; los <b>{plural(peor.etiqueta)}</b>,{' '}
        {Math.abs(vs(peor.ventas))} % menos.
      </p>
      <div className="dias-zona">
        <span className="dias-promedio" style={{ top: `${ALTO * (1 - promedio / maximo)}px` }} aria-hidden="true">
          <span>Promedio {pesosCortos(promedio)}</span>
        </span>
        <ul className="dias-semana">
          {puntos.map((p) => (
            <li key={p.orden} className={p.orden === mejor.orden ? 'dia-mejor' : ''}>
              <button
                type="button"
                aria-pressed={elegido === p.orden}
                onClick={() => setElegido(elegido === p.orden ? null : p.orden)}
                aria-label={`${p.etiqueta}: ${pesos(p.ventas)}`}
              >
                <span className="columna-dia" aria-hidden="true">
                  <span style={{ height: `${(p.ventas / maximo) * 100}%` }} />
                </span>
                <span className="monto" aria-hidden="true">
                  {pesosCortos(p.ventas)}
                </span>
                <span className="dia" aria-hidden="true">
                  {CORTO(p.etiqueta)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <p className="detalle-dia" aria-live="polite">
        {foco ? (
          <>
            <b>{foco.etiqueta.charAt(0).toUpperCase() + foco.etiqueta.slice(1)}:</b> {pesos(foco.ventas)} en {numero(foco.transacciones)} compras ·{' '}
            {vs(foco.ventas) >= 0 ? `${vs(foco.ventas)} % por encima` : `${Math.abs(vs(foco.ventas))} % por debajo`} del promedio.
          </>
        ) : (
          'Toca un día para ver su detalle.'
        )}
      </p>
    </div>
  )
}
