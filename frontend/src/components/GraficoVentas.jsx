import { useId, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { numero, pesos, pesosCortos } from '../formato.js'

// Lo que se puede mirar en el gráfico. "ticket" se calcula: ventas ÷ compras.
const METRICAS = {
  ventas: { texto: 'Ventas', formato: pesos, eje: pesosCortos },
  transacciones: { texto: 'Compras', formato: numero, eje: numero },
  ticket: { texto: 'Ticket promedio', formato: pesos, eje: pesosCortos },
}

// Textos según la unidad de cada barra (semana es femenino, día es masculino)
const UNIDADES = {
  semana: { mayor: 'La semana más alta', elegida: 'Semana elegida', anterior: 'la semana anterior', columna: 'Semana' },
  dia: { mayor: 'El día más alto', elegida: 'Día elegido', anterior: 'el día anterior', columna: 'Día' },
  mes: { mayor: 'El mes más alto', elegida: 'Mes elegido', anterior: 'el mes anterior', columna: 'Mes' },
}

const valorDe = (p, metrica) => (metrica === 'ticket' ? (p.transacciones ? p.ventas / p.transacciones : 0) : p[metrica])

// "+12 %" / "−8 %" / "igual"
function cambio(actual, antes) {
  if (!antes) return null
  const pct = Math.round(((actual - antes) / antes) * 100)
  if (pct === 0) return 'igual'
  return `${pct > 0 ? '+' : '−'}${Math.abs(pct)} %`
}

// Detalle que aparece al pasar el mouse o al moverse con las flechas del teclado.
// El valor va primero y en negrita; luego el contexto.
function Detalle({ active, payload, metrica, promedio, unidad, conAnterior }) {
  if (!active || !payload?.length) return null
  const m = METRICAS[metrica]
  const p = payload[0].payload
  const vsProm = cambio(p.valor, promedio)
  const vsPrevio = p.previo != null ? cambio(p.valor, p.previo) : null
  return (
    <div className="grafico-detalle">
      <strong>{m.formato(p.valor)}</strong>
      <span>{p.etiqueta}</span>
      <small>
        {numero(p.transacciones)} compras · ticket {pesos(valorDe(p, 'ticket'))}
      </small>
      {vsProm && <small>{vsProm} frente al promedio</small>}
      {vsPrevio && (
        <small>
          {vsPrevio} frente a {UNIDADES[unidad].anterior}
        </small>
      )}
      {conAnterior && p.anterior != null && (
        <small className="detalle-anterior">
          {p.etiquetaAnterior}: {m.formato(p.anterior)}
        </small>
      )}
      <small className="detalle-pista">Clic para fijarla abajo</small>
    </div>
  )
}

const sinMovimiento = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Gráfico de barras interactivo (Recharts) para P02 y P06:
// - pasar el mouse (o las flechas del teclado) muestra el detalle de cada barra;
// - hacer clic en una barra la deja fija en el recuadro de abajo;
// - línea punteada = promedio del período; la barra más alta va en mango con su valor escrito;
// - opcional: cambiar entre ventas, compras y ticket, y comparar con el período anterior (barras grises);
// - "Ver como tabla" muestra los mismos números sin gráfico (accesibilidad).
export default function GraficoVentas({
  puntos,
  anteriores = null,
  nombreAnterior = 'el período anterior',
  unidad = 'semana',
  alto = 260,
  conMetricas = true,
  descripcion,
}) {
  const [metrica, setMetrica] = useState('ventas')
  const [comparar, setComparar] = useState(false)
  const [elegida, setElegida] = useState(null)
  const [verTabla, setVerTabla] = useState(false)
  const idTabla = useId()
  const m = METRICAS[metrica]
  const hayAnterior = Boolean(anteriores?.some((p) => p.transacciones > 0))
  const mostrarAnterior = comparar && hayAnterior

  const datos = puntos.map((p, i) => ({
    ...p,
    valor: valorDe(p, metrica),
    anterior: anteriores?.[i] ? valorDe(anteriores[i], metrica) : null,
    etiquetaAnterior: anteriores?.[i]?.etiqueta,
    previo: i > 0 ? valorDe(puntos[i - 1], metrica) : null,
  }))
  const totalVentas = puntos.reduce((s, p) => s + p.ventas, 0)
  const totalCompras = puntos.reduce((s, p) => s + p.transacciones, 0)
  const promedio =
    metrica === 'ticket' ? (totalCompras ? totalVentas / totalCompras : 0) : datos.reduce((s, p) => s + p.valor, 0) / (datos.length || 1)
  const maximo = Math.max(...datos.map((p) => p.valor))
  const iMax = datos.findIndex((p) => p.valor === maximo)
  const foco = elegida ?? iMax
  const punto = datos[foco]

  const claseBarra = (i) => ['barra', i === iMax ? 'destacada' : '', i === elegida ? 'elegida' : ''].join(' ').trim()

  return (
    <div className="grafico-ventas">
      <div className="grafico-controles">
        {conMetricas && (
          <div className="seg seg-sm" role="group" aria-label="Qué mirar">
            {Object.entries(METRICAS).map(([id, x]) => (
              <button key={id} type="button" aria-pressed={metrica === id} onClick={() => setMetrica(id)}>
                {x.texto}
              </button>
            ))}
          </div>
        )}
        {hayAnterior && (
          <label className="interruptor">
            <input type="checkbox" checked={comparar} onChange={(e) => setComparar(e.target.checked)} />
            Comparar con {nombreAnterior}
          </label>
        )}
      </div>

      <ul className="leyenda" aria-label="Leyenda">
        {mostrarAnterior && (
          <>
            <li>
              <span className="muestra actual" /> Este período
            </li>
            <li>
              <span className="muestra anterior" /> {nombreAnterior.charAt(0).toUpperCase() + nombreAnterior.slice(1)}
            </li>
          </>
        )}
        <li>
          <span className="muestra promedio" /> Promedio: {m.formato(promedio)}
        </li>
      </ul>

      {!verTabla && (
        <div className="grafico" role="img" aria-label={descripcion}>
          <ResponsiveContainer width="100%" height={alto}>
            <BarChart data={datos} margin={{ top: 24, right: 8, left: 0, bottom: 0 }} barGap={2} barCategoryGap="18%">
              <CartesianGrid vertical={false} className="grafico-rejilla" />
              <XAxis dataKey="etiqueta" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={10} fontSize={12} />
              <YAxis tickFormatter={m.eje} tickLine={false} axisLine={false} width={68} fontSize={12} />
              <Tooltip
                content={<Detalle metrica={metrica} promedio={promedio} unidad={unidad} conAnterior={mostrarAnterior} />}
                cursor={{ className: 'grafico-cursor' }}
              />
              {mostrarAnterior && <Bar dataKey="anterior" className="barra-anterior" radius={[4, 4, 0, 0]} isAnimationActive={!sinMovimiento()} />}
              <Bar
                dataKey="valor"
                radius={[4, 4, 0, 0]}
                isAnimationActive={!sinMovimiento()}
                onClick={(_, i) => setElegida(i === elegida ? null : i)}
                cursor="pointer"
              >
                {datos.map((p, i) => (
                  <Cell key={p.etiqueta + i} className={claseBarra(i)} />
                ))}
                {/* Solo la barra más alta lleva su número escrito (los demás, al pasar el mouse) */}
                <LabelList
                  dataKey="valor"
                  content={({ x, y, width, value }) =>
                    value === maximo ? (
                      <text x={x + width / 2} y={y - 7} textAnchor="middle" className="etiqueta-max">
                        {m.eje(value)}
                      </text>
                    ) : null
                  }
                />
              </Bar>
              <ReferenceLine
                y={promedio}
                className="linea-promedio"
                strokeDasharray="4 4"
                ifOverflow="extendDomain"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {verTabla && (
        <div className="scroll" id={idTabla}>
          <table className="tbl">
            <thead>
              <tr>
                <th>{UNIDADES[unidad].columna}</th>
                <th className="n">Ventas</th>
                <th className="n">Compras</th>
                <th className="n">Ticket</th>
                {hayAnterior && <th className="n">{nombreAnterior}</th>}
              </tr>
            </thead>
            <tbody>
              {datos.map((p, i) => (
                <tr key={p.etiqueta + i}>
                  <td>{p.etiqueta}</td>
                  <td className="n">{pesos(p.ventas)}</td>
                  <td className="n">{numero(p.transacciones)}</td>
                  <td className="n">{pesos(valorDe(p, 'ticket'))}</td>
                  {hayAnterior && <td className="n">{anteriores[i] ? pesos(anteriores[i].ventas) : '—'}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {punto && (
        <div className="detalle-fijo" aria-live="polite">
          <div>
            <span className="detalle-titulo">
              {elegida == null ? UNIDADES[unidad].mayor : UNIDADES[unidad].elegida}: {punto.etiqueta}
            </span>
            <strong>{m.formato(punto.valor)}</strong>
          </div>
          <ul>
            <li>{numero(punto.transacciones)} compras</li>
            <li>ticket {pesos(valorDe(punto, 'ticket'))}</li>
            {cambio(punto.valor, promedio) && <li>{cambio(punto.valor, promedio)} vs. promedio</li>}
            {mostrarAnterior && punto.anterior != null && <li>{cambio(punto.valor, punto.anterior) || '—'} vs. {punto.etiquetaAnterior}</li>}
          </ul>
          <div className="row">
            {elegida != null && (
              <button type="button" className="enlace" onClick={() => setElegida(null)}>
                Quitar selección
              </button>
            )}
            <button type="button" className="enlace" aria-controls={idTabla} aria-expanded={verTabla} onClick={() => setVerTabla(!verTabla)}>
              {verTabla ? 'Ver como gráfico' : 'Ver como tabla'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
