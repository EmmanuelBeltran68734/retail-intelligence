import { useCallback, useEffect, useState } from 'react'
import { agotamientos, descargarPlantillaInventario, listarConteos, serieVentas, subirConteo } from '../api/cliente.js'
import { useSesion } from '../sesion/contexto.js'
import { guardarArchivo } from '../descargar.js'
import { fechaLarga, numero, pesos, plural } from '../formato.js'
import './Carga.css'
import './Inventario.css'

// Cómo se muestra cada tipo (observación O2): nunca «se agotó» sin un conteo en cero.
const TIPOS = {
  confirmado: { texto: 'Agotado confirmado', clase: 'bad', explica: 'Un conteo de existencias dice 0 unidades.' },
  posible: { texto: 'Posible agotamiento (sin conteo)', clase: 'warn', explica: 'Dejó de venderse, pero no hay un conteo que lo confirme.' },
  con_existencias: { texto: 'Tenía existencias: no fue agotamiento', clase: 'good', explica: 'El conteo muestra unidades en la tienda.' },
}

// Estado de un producto según su último conteo (nunca se dice «no hay» sin un conteo que lo diga)
function estadoDe(conteo) {
  if (!conteo) return { texto: 'Sin contar', clase: 'c', detalle: 'No está en tus conteos: revisa cuántas quedan.' }
  const cuando = `Conteo del ${fechaLarga(conteo.fecha)}`
  if (conteo.existencias <= 0) return { texto: 'Se acabó', clase: 'bad', detalle: `${cuando}: 0 unidades. Pídelo pronto.` }
  return { texto: `Hay ${numero(conteo.existencias)} ${conteo.existencias === 1 ? 'unidad' : 'unidades'}`, clase: 'good', detalle: `${cuando}.` }
}

// P15 · Inventario (O2). Rutas 20 (plantilla), 21 (subir conteo), 22 (conteos), 23 (agotamientos) y 17 (más vendidos).
// Orden: 1) subir el conteo; 2) cuánto hay de cada producto (los más vendidos con su último conteo); 3) los que dejaron de venderse.
export default function Inventario() {
  const { token } = useSesion()
  const [lista, setLista] = useState(null)
  const [conteos, setConteos] = useState(null)
  const [masVendidos, setMasVendidos] = useState(null)
  const [errorLista, setErrorLista] = useState('')
  const [encima, setEncima] = useState(false)
  const [subiendo, setSubiendo] = useState('')
  const [resultado, setResultado] = useState(null)
  const [error, setError] = useState(null)
  const [version, setVersion] = useState(0) // sube en 1 después de cada conteo, para volver a pedir las listas

  useEffect(() => {
    let activo = true
    // Ruta 17 (los 10 más vendidos de los últimos 30 días con ventas), 22 (conteos) y 23 (agotamientos)
    Promise.all([agotamientos(token), listarConteos(token), serieVentas(token, 'producto', { limite: 10 })])
      .then(([a, c, v]) => {
        if (!activo) return
        setLista(a)
        setConteos(c)
        setMasVendidos(v)
      })
      .catch((err) => activo && setErrorLista(err.mensaje))
    return () => {
      activo = false
    }
  }, [token, version])

  const subir = useCallback(
    async (archivo) => {
      if (!archivo || subiendo) return
      setError(null)
      setResultado(null)
      setSubiendo(archivo.name)
      try {
        setResultado(await subirConteo(token, archivo))
        setVersion((v) => v + 1)
      } catch (err) {
        setError({ mensaje: err.mensaje, faltan: err.faltan })
      } finally {
        setSubiendo('')
      }
    },
    [token, subiendo],
  )

  async function plantilla() {
    try {
      guardarArchivo(await descargarPlantillaInventario(), 'plantilla_inventario.csv')
    } catch (err) {
      setError({ mensaje: err.mensaje })
    }
  }

  const productos = lista?.productos || []
  // Último conteo de cada producto (la ruta 22 los trae del más reciente al más antiguo)
  const ultimoConteo = new Map()
  for (const c of conteos || []) if (!ultimoConteo.has(c.producto)) ultimoConteo.set(c.producto, c)
  const hayConteos = (conteos?.length || 0) > 0
  // Primero lo que se acabó, luego lo que falta contar y al final lo que sí hay
  const PRIORIDAD = { bad: 0, c: 1, good: 2 }
  const top = (masVendidos?.puntos || [])
    .map((p) => ({ ...p, estado: estadoDe(ultimoConteo.get(p.etiqueta)) }))
    .sort((a, b) => PRIORIDAD[a.estado.clase] - PRIORIDAD[b.estado.clase] || b.ventas - a.ventas)

  const subirArchivo = (
    <label
      className={`drop${encima ? ' encima' : ''}${subiendo ? ' ocupado' : ''}`}
      htmlFor="archivo-conteo"
      onDragOver={(e) => {
        e.preventDefault()
        setEncima(true)
      }}
      onDragLeave={() => setEncima(false)}
      onDrop={(e) => {
        e.preventDefault()
        setEncima(false)
        subir(e.dataTransfer.files?.[0])
      }}
    >
      <input
        id="archivo-conteo"
        type="file"
        accept=".csv,.xlsx"
        disabled={Boolean(subiendo)}
        onChange={(e) => {
          subir(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      {subiendo ? (
        <span className="drop-titulo" role="status">
          Revisando {subiendo}…
        </span>
      ) : (
        <>
          <span className="drop-titulo">Arrastra aquí tu conteo o haz clic para buscarlo</span>
          <span className="sub">CSV o Excel (.xlsx) con las columnas fecha, codigo_producto y existencias.</span>
          <span className="btn" aria-hidden="true">
            Elegir archivo
          </span>
        </>
      )}
    </label>
  )

  return (
    <>
      <div>
        <h1>Inventario</h1>
        <p className="sub">
          Lleva el control de lo que hay en tu tienda: sube un conteo y te mostramos cuánto queda de cada producto y cuáles se
          acabaron. Que un producto deje de venderse no prueba que se acabó: solo un conteo en 0 lo confirma.
        </p>
      </div>

      <div className="grid2">
        {/* Izquierda: la información del inventario */}
        <div className="stack">
          {errorLista && (
            <p className="aviso error" role="alert">
              {errorLista}
            </p>
          )}
          {!lista && !errorLista && <p className="cargando">Revisando tus ventas y conteos…</p>}

          {lista && (
            <section className="card">
              <h2>Cuánto hay de cada producto</h2>
              {!hayConteos ? (
                <p className="aviso info">Sube tu primer conteo para saber cuánto hay de cada producto y cuáles se acabaron.</p>
              ) : top.length === 0 ? (
                <p className="sub sin-margen">Cuando subas tus ventas, aquí verás tus productos más vendidos con su conteo.</p>
              ) : (
                <>
                  <p className="sub sin-margen">
                    Tus {numero(top.length)} productos más vendidos de los últimos 30 días con ventas y cuántas unidades quedan
                    según tu último conteo. Primero, los que se acabaron.
                  </p>
                  <ul className="pedir-lista">
                    {top.map((p) => {
                      const { estado } = p
                      return (
                        <li key={p.id ?? p.etiqueta} className={`pedir ${estado.clase}`}>
                          <span className="pedir-nombre">
                            {p.etiqueta}
                            <small>Vendiste {pesos(p.ventas)}</small>
                          </span>
                          <span className="pedir-estado">
                            <span className={`pill ${estado.clase}`}>{estado.texto}</span>
                            <small>{estado.detalle}</small>
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </>
              )}
            </section>
          )}

          {lista && (
            <section className="card">
              <h2>Productos que dejaron de venderse</h2>
              {lista.sin_datos && <p className="sub sin-margen">Cuando subas tus ventas, aquí verás los productos que dejaron de venderse.</p>}
              {!lista.sin_datos && productos.length === 0 && (
                <p className="aviso exito">Ningún producto lleva una racha rara sin venderse. ¡Bien!</p>
              )}
              {productos.length > 0 && (
                <>
                  <ul className="agot-resumen" aria-label="Resumen">
                    {Object.entries(TIPOS).map(([tipo, t]) => (
                      <li key={tipo}>
                        <span className={`pill ${t.clase}`}>{t.texto}</span> <b>{numero(lista.resumen?.[tipo] ?? 0)}</b>
                      </li>
                    ))}
                  </ul>
                  <ul className="agot-lista">
                    {productos.map((p) => {
                      const t = TIPOS[p.tipo] || TIPOS.posible
                      return (
                        <li key={p.producto.id ?? p.producto.codigo} className={`agot ${t.clase}`}>
                          <div className="agot-arriba">
                            <span className="agot-nombre">
                              {p.producto.nombre}
                              <small>
                                {p.producto.codigo} · {p.producto.categoria}
                              </small>
                            </span>
                            <span className={`pill ${t.clase}`}>{t.texto}</span>
                          </div>
                          <p className="sin-margen">{p.mensaje}</p>
                          <p className="sub sin-margen agot-datos">
                            Última venta: {fechaLarga(p.ultima_venta)} · {plural(p.dias_sin_venta, 'día')} de venta sin venderse ·{' '}
                            {t.explica}
                          </p>
                        </li>
                      )
                    })}
                  </ul>
                </>
              )}
              {lista.regla?.descripcion && <p className="sub sin-margen agot-regla">Cómo lo decidimos: {lista.regla.descripcion}</p>}
            </section>
          )}
        </div>

        {/* Derecha: subir el conteo y los conteos guardados */}
        <div className="stack">
          <section className="card">
            <h2>Sube un conteo de existencias</h2>
            <p className="sub sin-margen">
              Anota cuántas unidades hay de cada producto (0 si no hay), con la fecha del conteo y el mismo código de tus ventas.
            </p>
            {subirArchivo}
            <div className="row">
              <button className="btn alt sm" type="button" onClick={plantilla}>
                Plantilla de inventario (CSV)
              </button>
            </div>

            {error && (
              <div className="aviso error" role="alert">
                <p className="sin-margen">{error.mensaje}</p>
                {error.faltan?.length > 0 && <p className="sin-margen">Faltan: {error.faltan.join(', ')}.</p>}
              </div>
            )}

            {resultado && (
              <p className={`aviso ${resultado.filas_con_error ? 'info' : 'exito'}`} role="status">
                {resultado.nombre_archivo}: guardamos {plural(resultado.conteos_guardados, 'conteo')}
                {resultado.conteos_actualizados ? ` y actualizamos ${numero(resultado.conteos_actualizados)}` : ''}.
                {resultado.filas_con_error
                  ? resultado.filas_con_error === 1
                    ? ' 1 fila con error no se guardó.'
                    : ` ${numero(resultado.filas_con_error)} filas con error no se guardaron.`
                  : ' Todo estaba bien.'}
              </p>
            )}

            {resultado?.errores?.length > 0 && (
              <div className="scroll">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th className="n">Fila</th>
                      <th>Qué pasó</th>
                      <th>Cómo arreglarlo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.errores.map((e) => (
                      <tr key={`${e.fila}-${e.columna}`}>
                        <td className="n">{e.fila}</td>
                        <td>{e.mensaje}</td>
                        <td>{e.sugerencia}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="card">
            <h2>Conteos guardados</h2>
            {!conteos?.length && <p className="sub sin-margen">Todavía no has subido conteos.</p>}
            {conteos?.length > 0 && (
              <div className="scroll">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Producto</th>
                      <th className="n">Existencias</th>
                    </tr>
                  </thead>
                  <tbody>
                    {conteos.slice(0, 15).map((c) => (
                      <tr key={`${c.codigo}-${c.fecha}`}>
                        <td>{fechaLarga(c.fecha)}</td>
                        <td>
                          {c.producto} <small className="sub">{c.codigo}</small>
                        </td>
                        <td className="n">{numero(c.existencias)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  )
}
