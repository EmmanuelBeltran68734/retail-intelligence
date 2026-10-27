import { pesos, porcentaje } from '../formato.js'

// Ventas por categoría. Cada fila es un botón: al hacer clic, todo el tablero
// se filtra a esa categoría (lo mismo que el selector de arriba).
export default function BarrasCategorias({ puntos, alElegir }) {
  const total = puntos.reduce((s, p) => s + p.ventas, 0)
  const mayor = puntos[0]?.ventas || 1
  return (
    <ul className="barras-h">
      {puntos.map((p, i) => {
        const parte = total ? (p.ventas / total) * 100 : 0
        return (
          <li key={p.id}>
            <button type="button" className="fila-barra" onClick={() => alElegir(p.id)} title={`Ver solo ${p.etiqueta}`}>
              <span className="fila-arriba">
                <span className="fila-nombre">{p.etiqueta}</span>
                <span className="fila-valor">
                  <b>{pesos(p.ventas)}</b> · {porcentaje(Math.round(parte))}
                </span>
              </span>
              <span className={`hbar${i === 0 ? ' m' : ''}`} aria-hidden="true">
                <span style={{ width: `${(p.ventas / mayor) * 100}%` }} />
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
