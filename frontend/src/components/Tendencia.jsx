import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from 'recharts'
import { pesos } from '../formato.js'

function Detalle({ active, payload }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="grafico-detalle">
      <strong>{pesos(p.ventas)}</strong>
      <span>{p.etiqueta}</span>
    </div>
  )
}

// Mini línea con las ventas de los últimos meses, dentro de una tarjeta.
// El punto final (mango) es el mes que se está viendo. Al pasar el mouse muestra cada mes.
export default function Tendencia({ puntos }) {
  if (!puntos || puntos.length < 2) return null
  const ultimo = puntos.length - 1
  return (
    <div className="tendencia" role="img" aria-label={`Ventas de los últimos ${puntos.length} meses: ${puntos.map((p) => `${p.etiqueta} ${pesos(p.ventas)}`).join(', ')}`}>
      <ResponsiveContainer width="100%" height={44}>
        <LineChart data={puntos} margin={{ top: 6, right: 6, bottom: 4, left: 6 }}>
          <YAxis hide domain={['dataMin', 'dataMax']} />
          <Tooltip content={<Detalle />} cursor={{ className: 'grafico-cursor-linea' }} />
          <Line
            type="monotone"
            dataKey="ventas"
            className="tendencia-linea"
            strokeWidth={2}
            isAnimationActive={false}
            dot={(props) =>
              props.index === ultimo ? (
                <circle key="fin" cx={props.cx} cy={props.cy} r={4} className="tendencia-fin" />
              ) : (
                <g key={props.index} />
              )
            }
            activeDot={{ r: 4, className: 'tendencia-activo' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
