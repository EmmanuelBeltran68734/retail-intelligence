import { useEffect, useMemo, useState } from 'react'
import { listarCategorias, resumenIndicadores, serieVentas } from '../api/cliente.js'
import { useSesion } from '../sesion/contexto.js'
import { useMesesConVentas } from '../indicadores/meses.js'
import GraficoVentas from '../components/GraficoVentas.jsx'
import BarrasCategorias from '../components/BarrasCategorias.jsx'
import DiasSemana from '../components/DiasSemana.jsx'
import TopProductos from '../components/TopProductos.jsx'
import Tendencia from '../components/Tendencia.jsx'
import Cambio from '../components/Cambio.jsx'
import SinVentas from '../components/SinVentas.jsx'
import { diasEntre, finDeMes, menor, periodoAnterior, sumarDias, sumarMeses } from '../fechas.js'
import { nombreMes, numero, periodoTexto, pesos, plural, porcentaje } from '../formato.js'
import './Tablero.css'

const ALCANCES = [
  { id: 'semana', texto: 'Semana', serie: 'dia', unidad: 'dia', titulo: 'Ventas por día' },
  { id: 'mes', texto: 'Mes', serie: 'semana', unidad: 'semana', titulo: 'Ventas por semana' },
  { id: 'trimestre', texto: 'Trimestre', serie: 'semana', unidad: 'semana', titulo: 'Ventas por semana' },
]

// Fechas del período según lo que se eligió arriba
function rango(alcance, mes, ultimaVenta) {
  const finMes = finDeMes(mes)
  if (alcance === 'trimestre') return { desde: sumarMeses(mes, -2), hasta: finMes }
  if (alcance === 'semana') {
    const fin = menor(finMes, ultimaVenta)
    return { desde: sumarDias(fin, -6), hasta: fin }
  }
  return { desde: mes, hasta: finMes }
}

// Cómo se llama el período con el que se compara
function nombreAnterior(alcance, anterior) {
  if (alcance === 'mes') return nombreMes(anterior.desde)
  if (alcance === 'semana') return 'los 7 días anteriores'
  return 'el trimestre anterior'
}

const mejor = (puntos) => puntos.reduce((a, p) => (p.ventas > a.ventas ? p : a), puntos[0])
const conMayuscula = (t) => t.charAt(0).toUpperCase() + t.slice(1)

// P06 · Tablero de ventas (RF-05, RF-06). Rutas 13 (categorías), 16 (resumen) y 17 (series).
export default function Tablero() {
  const { token } = useSesion()
  const meses = useMesesConVentas(token)
  const [elegido, setElegido] = useState(null) // mes elegido por la persona; si no, el último completo
  const [alcance, setAlcance] = useState('mes')
  const [categoria, setCategoria] = useState('')
  const [categorias, setCategorias] = useState([])
  const [datos, setDatos] = useState(null)
  const [fallo, setFallo] = useState(null)
  const mes = elegido || meses.porDefecto
  const filtros = useMemo(
    () => (mes ? { ...rango(alcance, mes, meses.ultimaVenta), categoria_id: categoria || undefined } : null),
    [mes, alcance, categoria, meses.ultimaVenta],
  )
  const info = ALCANCES.find((a) => a.id === alcance)
  // Cada combinación de filtros tiene su "clave": así se sabe si lo que se ve ya corresponde a los filtros elegidos
  const clave = filtros ? JSON.stringify([filtros, info.serie]) : ''
  const error = fallo?.clave === clave ? fallo.mensaje : ''
  const cargando = !error && datos?.clave !== clave

  // Ruta 13: categorías para el filtro
  useEffect(() => {
    let activo = true
    listarCategorias(token)
      .then((lista) => activo && setCategorias(lista))
      .catch(() => {})
    return () => {
      activo = false
    }
  }, [token])

  // Rutas 16 y 17: se recalcula todo cada vez que cambia un filtro
  useEffect(() => {
    if (!filtros) return
    let activo = true
    const anterior = { ...periodoAnterior(filtros.desde, filtros.hasta), categoria_id: filtros.categoria_id }
    Promise.all([
      resumenIndicadores(token, filtros),
      serieVentas(token, info.serie, filtros),
      serieVentas(token, info.serie, anterior),
      serieVentas(token, 'categoria', filtros),
      serieVentas(token, 'dia_semana', filtros),
      serieVentas(token, 'producto', { ...filtros, limite: 10 }),
    ])
      .then(([resumen, tiempo, tiempoAnterior, porCategoria, porDia, productos]) => {
        if (!activo) return
        setDatos({
          clave,
          resumen,
          anterior,
          tiempo: tiempo.puntos,
          tiempoAnterior: tiempoAnterior.puntos || [],
          porCategoria: porCategoria.puntos,
          porDia: porDia.puntos,
          productos: productos.puntos,
        })
      })
      .catch((err) => activo && setFallo({ clave, mensaje: err.mensaje }))
    return () => {
      activo = false
    }
  }, [token, filtros, info.serie, clave])

  const titulo = (
    <div>
      <h1>Tablero de ventas</h1>
      <p className="sub">Elige el período y la categoría; todo se recalcula al momento. Pasa el mouse o toca los gráficos para ver el detalle.</p>
    </div>
  )

  if (meses.error) {
    return (
      <>
        {titulo}
        <p className="aviso error" role="alert">
          {meses.error}
        </p>
      </>
    )
  }
  if (meses.sinDatos) {
    return (
      <>
        {titulo}
        <SinVentas />
      </>
    )
  }
  if (!mes) return <p className="cargando">Preparando tu tablero…</p>

  const r = datos?.resumen
  const vacio = r && !r.sin_datos && r.transacciones.valor === 0
  const diasPeriodo = filtros ? diasEntre(filtros.desde, filtros.hasta) : 1
  const nombreCategoria = categorias.find((c) => String(c.id) === String(categoria))?.nombre
  // Mini tendencia: hasta 6 meses que terminan en el mes elegido (solo sin filtro de categoría)
  const iMes = meses.puntos?.findIndex((p) => p.inicio === mes) ?? -1
  const tendencia = !categoria && iMes >= 0 ? meses.puntos.slice(Math.max(0, iMes - 5), iMes + 1) : null
  // Período cargado a medias (observación O5): no se compara y se avisa junto a los filtros
  const incompleto = Boolean(r?.crecimiento?.periodo_incompleto)
  const comparadoCon = datos && !incompleto ? nombreAnterior(alcance, datos.anterior) : ''

  return (
    <>
      {titulo}

      {/* Filtros: una sola fila, arriba de todo lo que afectan */}
      <div className="filtros">
        <div className="seg" role="group" aria-label="Período">
          {ALCANCES.map((a) => (
            <button key={a.id} type="button" aria-pressed={alcance === a.id} onClick={() => setAlcance(a.id)}>
              {a.texto}
            </button>
          ))}
        </div>
        <label className="selector">
          <span className="oculto">Mes</span>
          <select value={mes} onChange={(e) => setElegido(e.target.value)}>
            {[...meses.meses].reverse().map((m) => (
              <option key={m.inicio} value={m.inicio}>
                {conMayuscula(m.nombre)}
              </option>
            ))}
          </select>
        </label>
        <label className="selector">
          <span className="oculto">Categoría</span>
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            <option value="">Todas las categorías</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>
        {categoria && (
          <button type="button" className="btn alt sm" onClick={() => setCategoria('')}>
            Quitar filtro: {nombreCategoria} ×
          </button>
        )}
      </div>

      <p className="sub sin-margen periodo-actual" aria-live="polite">
        {conMayuscula(periodoTexto(filtros))}
        {nombreCategoria ? ` · solo ${nombreCategoria}` : ''}
        {comparadoCon ? ` · comparado con ${comparadoCon}` : ''}
        {alcance === 'semana' ? ' · los últimos 7 días con ventas del mes' : ''}
        {cargando && ' · actualizando…'}
      </p>

      {incompleto && !cargando && (
        <p className="aviso info" role="status">
          {r.crecimiento.frase}
        </p>
      )}

      {error && (
        <p className="aviso error" role="alert">
          {error}
        </p>
      )}

      {!datos && !error && <p className="cargando">Calculando…</p>}

      {datos && vacio && (
        <p className="aviso info">
          No hay ventas en este período{nombreCategoria ? ` para ${nombreCategoria}` : ''}. Prueba con otro mes o categoría.
        </p>
      )}

      {datos && !vacio && (
        <div className={`stack${cargando ? ' actualizando' : ''}`}>
          <div className="grid4">
            <div className="card kpi">
              <div className="lab">Ventas</div>
              <div className="val">{pesos(r.ventas_totales.valor)}</div>
              <Cambio valor={r.crecimiento.valor} />
              {/* Si el período está incompleto, la explicación ya está en el aviso de arriba: no se repite */}
              <div className="exp">{incompleto ? 'Sin comparación con el período anterior: mira el aviso de arriba.' : r.crecimiento.frase}</div>
              {tendencia && alcance === 'mes' && <Tendencia puntos={tendencia} />}
            </div>
            <div className="card kpi">
              <div className="lab">Ticket promedio</div>
              <div className="val">{pesos(r.ticket_promedio.valor)}</div>
              <div className="exp">Lo que gasta cada cliente por compra, en promedio.</div>
            </div>
            <div className="card kpi">
              <div className="lab">Compras</div>
              <div className="val">{numero(r.transacciones.valor)}</div>
              <div className="exp">Unas {numero(Math.round(r.transacciones.valor / diasPeriodo))} al día.</div>
            </div>
            <div className="card kpi">
              <div className="lab">Top {r.concentracion.top_productos} productos</div>
              <div className="val">{porcentaje(r.concentracion.valor)}</div>
              <div className="medidor" aria-hidden="true">
                <span style={{ width: `${r.concentracion.valor}%` }} />
              </div>
              <div className="exp">de todo lo que vendes sale de ellos.</div>
            </div>
          </div>

          <section className="card">
            <div className="row between">
              <h2>{info.titulo}</h2>
              {alcance !== 'semana' && diasPeriodo % 7 !== 0 && (
                <span className="sub sin-margen">La última barra tiene solo {plural(diasPeriodo % 7, 'día')}.</span>
              )}
            </div>
            {datos.tiempo.length > 0 && (
              <GraficoVentas
                key={clave}
                puntos={datos.tiempo}
                anteriores={incompleto ? null : datos.tiempoAnterior}
                nombreAnterior={comparadoCon}
                unidad={info.unidad}
                descripcion={`${info.titulo}. El punto más alto fue ${mejor(datos.tiempo).etiqueta}, con ${pesos(mejor(datos.tiempo).ventas)}.`}
              />
            )}
          </section>

          <div className="grid2">
            <section className="card">
              <div className="row between">
                <h2>Por categoría</h2>
                {!categoria && <span className="sub sin-margen">Toca una para ver solo esa</span>}
              </div>
              {categoria ? (
                <p className="sub sin-margen">
                  Estás viendo solo <b>{nombreCategoria}</b>.{' '}
                  <button type="button" className="enlace" onClick={() => setCategoria('')}>
                    Ver todas las categorías
                  </button>
                </p>
              ) : (
                <>
                  <BarrasCategorias puntos={datos.porCategoria} alElegir={(id) => setCategoria(String(id))} />
                  {datos.porCategoria.length > 1 && (
                    <p className="sub sin-margen">
                      {datos.porCategoria[0].etiqueta} es lo que más vendes en el período.
                    </p>
                  )}
                </>
              )}
            </section>

            <section className="card">
              <h2>Lo que más vendes</h2>
              <TopProductos puntos={datos.productos} totalVentas={r.ventas_totales.valor} />
              <p className="sub sin-margen">{r.concentracion.frase}</p>
            </section>
          </div>

          <section className="card">
            <div className="row between">
              <h2>Ventas por día de la semana</h2>
              <span className="sub sin-margen">Total del período</span>
            </div>
            <DiasSemana key={clave} puntos={datos.porDia} />
          </section>
        </div>
      )}
    </>
  )
}
