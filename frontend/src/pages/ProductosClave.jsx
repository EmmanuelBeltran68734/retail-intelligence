import { useEffect, useMemo, useState } from 'react'
import { listarCategorias, productosClave } from '../api/cliente.js'
import { useSesion } from '../sesion/contexto.js'
import { useMesesConVentas } from '../indicadores/meses.js'
import SinVentas from '../components/SinVentas.jsx'
import { finDeMes } from '../fechas.js'
import { nombreMes, numero, periodoTexto, pesos, plural, porcentaje } from '../formato.js'
import './Tablero.css'
import './ProductosClave.css'

// Título y explicación de cada grupo (igual que en el prototipo)
const GRUPOS = {
  A: { titulo: 'No te pueden faltar', parte: (r) => `hacen el ${porcentaje(r.porcentaje_ventas)} de lo que vendes.` },
  B: { titulo: 'Míralos cada semana', parte: (r) => `suman el siguiente ${porcentaje(r.porcentaje_ventas)}.` },
  C: { titulo: 'Pide poco y con calma', parte: (r) => `hacen el último ${porcentaje(r.porcentaje_ventas)}.` },
}
const conMayuscula = (t) => t.charAt(0).toUpperCase() + t.slice(1)

// P07 · Productos clave (RF-07, HU-08). Rutas 13 (categorías) y 18 (ABC).
export default function ProductosClave() {
  const { token } = useSesion()
  const meses = useMesesConVentas(token)
  const [elegido, setElegido] = useState(null)
  const [categoria, setCategoria] = useState('')
  const [categorias, setCategorias] = useState([])
  const [grupo, setGrupo] = useState('') // '' = todos; si no, solo A, B o C en la tabla
  const [datos, setDatos] = useState(null)
  const [fallo, setFallo] = useState(null)
  const mes = elegido || meses.porDefecto
  const filtros = useMemo(
    () => (mes ? { desde: mes, hasta: finDeMes(mes), categoria_id: categoria || undefined } : null),
    [mes, categoria],
  )
  // Igual que en el tablero: la "clave" dice si lo que se ve ya corresponde a los filtros
  const clave = filtros ? JSON.stringify(filtros) : ''
  const error = fallo?.clave === clave ? fallo.mensaje : ''
  const cargando = !error && datos?.clave !== clave

  useEffect(() => {
    let activo = true
    listarCategorias(token)
      .then((lista) => activo && setCategorias(lista))
      .catch(() => {})
    return () => {
      activo = false
    }
  }, [token])

  useEffect(() => {
    if (!filtros) return
    let activo = true
    productosClave(token, filtros)
      .then((r) => activo && setDatos({ clave, ...r }))
      .catch((err) => activo && setFallo({ clave, mensaje: err.mensaje }))
    return () => {
      activo = false
    }
  }, [token, filtros, clave])

  const titulo = (texto) => (
    <div>
      <h1>Productos clave</h1>
      <p className="sub">{texto}</p>
    </div>
  )

  if (meses.error) {
    return (
      <>
        {titulo('No todos los productos pesan igual.')}
        <p className="aviso error" role="alert">
          {meses.error}
        </p>
      </>
    )
  }
  if (meses.sinDatos) {
    return (
      <>
        {titulo('No todos los productos pesan igual. Cuando subas tus ventas te diremos cuáles sostienen tu negocio.')}
        <SinVentas />
      </>
    )
  }
  if (!mes) return <p className="cargando">Buscando tus productos clave…</p>

  const nombreCategoria = categorias.find((c) => String(c.id) === String(categoria))?.nombre
  const resumen = datos?.resumen || []
  const productos = datos?.productos || []
  const total = productos.length
  const visibles = grupo ? productos.filter((p) => p.grupo === grupo) : productos
  const a = resumen.find((r) => r.grupo === 'A')

  return (
    <>
      {titulo(
        `No todos los productos pesan igual. Aquí ves cuáles sostienen tus ventas de ${nombreMes(mes)} y cómo cuidarlos.`,
      )}

      <div className="filtros">
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
        {cargando && ' · actualizando…'}
      </p>

      {error && (
        <p className="aviso error" role="alert">
          {error}
        </p>
      )}
      {!datos && !error && <p className="cargando">Calculando…</p>}

      {datos && total === 0 && (
        <p className="aviso info">
          No hay ventas en este período{nombreCategoria ? ` para ${nombreCategoria}` : ''}. Prueba con otro mes o categoría.
        </p>
      )}

      {datos && total > 0 && (
        <div className={`stack${cargando ? ' actualizando' : ''}`}>
          {/* Lo más importante en una frase y en dos barras: pocos productos, mucha venta */}
          <section className="card">
            <h2>
              {plural(a?.productos || 0, 'producto')} de {numero(total)} hacen el {porcentaje(a?.porcentaje_ventas)} de tus ventas
            </h2>
            <div className="abc-barras" role="img" aria-label={resumen.map((r) => `Grupo ${r.grupo}: ${r.productos} productos y ${r.porcentaje_ventas} % de las ventas`).join('. ')}>
              <div className="abc-fila">
                <span className="abc-etiqueta">Tus productos</span>
                <span className="abc-barra">
                  {resumen.map((r) =>
                    r.productos ? (
                      <span key={r.grupo} className={`abc-tramo ${r.grupo.toLowerCase()}`} style={{ flexGrow: r.productos }}>
                        {r.productos}
                      </span>
                    ) : null,
                  )}
                </span>
              </div>
              <div className="abc-fila">
                <span className="abc-etiqueta">Tus ventas</span>
                <span className="abc-barra">
                  {resumen.map((r) =>
                    r.porcentaje_ventas > 0 ? (
                      <span key={r.grupo} className={`abc-tramo ${r.grupo.toLowerCase()}`} style={{ flexGrow: r.porcentaje_ventas }}>
                        {r.porcentaje_ventas >= 8 ? porcentaje(Math.round(r.porcentaje_ventas)) : ''}
                      </span>
                    ) : null,
                  )}
                </span>
              </div>
            </div>
            <p className="sub sin-margen">Toca un grupo para ver solo sus productos en la tabla.</p>
          </section>

          <div className="grid3">
            {resumen.map((r) => (
              <button
                key={r.grupo}
                type="button"
                className="card abc-tarjeta"
                aria-pressed={grupo === r.grupo}
                onClick={() => setGrupo(grupo === r.grupo ? '' : r.grupo)}
              >
                <span className="row">
                  <span className={`pill ${r.grupo.toLowerCase()}`}>{r.grupo}</span>
                  <span className="abc-titulo">{GRUPOS[r.grupo].titulo}</span>
                </span>
                <span className="sub sin-margen">
                  <b>{plural(r.productos, 'producto')}</b> que {GRUPOS[r.grupo].parte(r)}
                </span>
                <span className="abc-consejo">{r.consejo}</span>
              </button>
            ))}
          </div>

          <section className="card">
            <div className="row between">
              <h2>{grupo ? `Grupo ${grupo}: ${GRUPOS[grupo].titulo.toLowerCase()}` : 'Todos tus productos'}</h2>
              {grupo && (
                <button type="button" className="enlace" onClick={() => setGrupo('')}>
                  Ver todos
                </button>
              )}
            </div>
            <div className="scroll">
              <table className="tbl abc-tabla">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th>Grupo</th>
                    <th className="n">Ventas</th>
                    <th className="n">% de tus ventas</th>
                    <th className="abc-col-acumulado">Acumulado</th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((p) => (
                    <tr key={p.id}>
                      <td>
                        {p.nombre}
                        {p.codigo && <small className="abc-codigo">{p.codigo}</small>}
                      </td>
                      <td>{p.categoria}</td>
                      <td>
                        <span className={`pill ${p.grupo.toLowerCase()}`}>{p.grupo}</span>
                      </td>
                      <td className="n">{pesos(p.ventas)}</td>
                      <td className="n">{porcentaje(p.porcentaje)}</td>
                      <td>
                        <span className="abc-acumulado">
                          <span className="hbar" aria-hidden="true">
                            <span className={`abc-relleno ${p.grupo.toLowerCase()}`} style={{ width: `${p.porcentaje_acumulado}%` }} />
                          </span>
                          <span className="abc-numero">{porcentaje(p.porcentaje_acumulado)}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="sub sin-margen">
              Cómo se arman los grupos: ordenamos tus productos de mayor a menor venta y vamos sumando. Los primeros, hasta
              llegar al {datos.cortes?.A ?? 80} % de lo que vendes, son A; los siguientes, hasta el {datos.cortes?.B ?? 95} %, son B;
              el resto son C. Los grupos se recalculan con cada carga.
            </p>
          </section>
        </div>
      )}
    </>
  )
}
