import { useState } from 'react'
import { numero, pesos, porcentaje } from '../formato.js'

// Los productos que más venden, con barra proporcional y su parte de las ventas del período.
// Se puede ver el top 5 o el top 10.
export default function TopProductos({ puntos, totalVentas }) {
  const [cuantos, setCuantos] = useState(5)
  const lista = puntos.slice(0, cuantos)
  const mayor = lista[0]?.ventas || 1
  return (
    <div className="stack" style={{ gap: 12 }}>
      {puntos.length > 5 && (
        <div className="seg seg-sm" role="group" aria-label="Cuántos productos">
          {[5, 10].map((n) => (
            <button key={n} type="button" aria-pressed={cuantos === n} onClick={() => setCuantos(n)}>
              Top {n}
            </button>
          ))}
        </div>
      )}
      <ol className="barras-h top-productos">
        {lista.map((p, i) => (
          <li key={p.id}>
            <span className="fila-arriba">
              <span className="fila-nombre">
                <span className="puesto">{i + 1}</span>
                {p.etiqueta}
              </span>
              <span className="fila-valor">
                <b>{pesos(p.ventas)}</b> · {porcentaje(totalVentas ? (p.ventas / totalVentas) * 100 : 0)}
              </span>
            </span>
            <span className={`hbar${i === 0 ? ' m' : ''}`} aria-hidden="true">
              <span style={{ width: `${(p.ventas / mayor) * 100}%` }} />
            </span>
            <small className="sub">{numero(p.transacciones)} compras</small>
          </li>
        ))}
      </ol>
    </div>
  )
}
