import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { confirmarCarga, descartarCarga, verCarga } from '../api/cliente.js'
import { useSesion } from '../sesion/contexto.js'
import PasosCarga from '../components/PasosCarga.jsx'
import { pendiente } from '../estadosCarga.js'
import { guardarArchivo } from '../descargar.js'
import { numero, periodoTexto, plural } from '../formato.js'
import { aCsv } from '../plantilla.js'
import './Carga.css'

const POR_PAGINA = 30

// El mensaje de Bianca empieza con "Fila 15: ..."; como la tarjeta ya dice la fila, se quita esa parte.
function sinFila(mensaje) {
  const texto = String(mensaje || '').replace(/^Fila \d+:\s*/, '')
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

const nombreColumna = (c) => (c === 'fila' ? 'fila repetida' : c)

function textoGuardar(validas, hayErrores) {
  if (validas === 1) return hayErrores ? 'Guardar la fila que está bien' : 'Guardar la venta'
  return hayErrores ? `Guardar las ${numero(validas)} que están bien` : `Guardar las ${numero(validas)} ventas`
}

// P04 · Revisión del archivo (RF-02, RF-04). Rutas 10 (ver), 11 (confirmar) y 12 (descartar).
export default function RevisionCarga() {
  const { id } = useParams()
  const { token } = useSesion()
  const navegar = useNavigate()
  const { state } = useLocation()
  // Si venimos de P03, la carga ya llegó en la navegación y no hay que pedirla otra vez
  const recibida = state?.carga && String(state.carga.id) === id ? state.carga : null
  const [cargaPedida, setCargaPedida] = useState(null)
  const [errorCarga, setErrorCarga] = useState('')
  const [mostrar, setMostrar] = useState(POR_PAGINA)
  const [ocupado, setOcupado] = useState('')
  const [errorAccion, setErrorAccion] = useState('')
  const [seguroDescartar, setSeguroDescartar] = useState(false)
  const carga = recibida || (cargaPedida?.id === id ? cargaPedida : null)

  // Ruta 10: GET /cargas/{id}
  useEffect(() => {
    if (recibida) return
    let activo = true
    verCarga(token, id)
      .then((c) => activo && setCargaPedida({ ...c, id: String(c.id) }))
      .catch((err) => activo && setErrorCarga(err.mensaje))
    return () => {
      activo = false
    }
  }, [token, id, recibida])

  const errores = useMemo(() => [...(carga?.errores || [])].sort((a, b) => a.fila - b.fila), [carga])
  const porColumna = useMemo(() => {
    const cuenta = {}
    for (const e of errores) cuenta[e.columna] = (cuenta[e.columna] || 0) + 1
    return Object.entries(cuenta).sort((a, b) => b[1] - a[1])
  }, [errores])

  // Ruta 11: POST /cargas/{id}/confirmar
  async function guardar() {
    setErrorAccion('')
    setOcupado('guardar')
    try {
      const resultado = await confirmarCarga(token, id)
      navegar(`/cargar/${id}/listo`, {
        state: { resultado, nombre_archivo: carga.nombre_archivo, filas_con_error: carga.filas_con_error },
        replace: true,
      })
    } catch (err) {
      setErrorAccion(err.mensaje)
      setOcupado('')
    }
  }

  // Ruta 12: DELETE /cargas/{id}
  async function descartar() {
    setErrorAccion('')
    setOcupado('descartar')
    try {
      await descartarCarga(token, id)
      navegar('/cargar', { replace: true })
    } catch (err) {
      setErrorAccion(err.mensaje)
      setOcupado('')
    }
  }

  function bajarErrores() {
    const filas = errores.map((e) => [e.fila, e.columna, e.valor ?? '', e.mensaje, e.sugerencia ?? ''])
    const texto = aCsv(['fila', 'columna', 'valor', 'que_paso', 'como_arreglarlo'], filas)
    const base = carga.nombre_archivo.replace(/\.[^.]+$/, '')
    guardarArchivo(new Blob([texto], { type: 'text/csv;charset=utf-8' }), `errores_${base}.csv`)
  }

  if (errorCarga) {
    return (
      <>
        <h1>Revisamos tu archivo</h1>
        <p className="aviso error" role="alert">
          {errorCarga}
        </p>
        <Link className="btn alt" to="/cargar" style={{ justifySelf: 'start' }}>
          Volver a Cargar ventas
        </Link>
      </>
    )
  }

  if (!carga) return <p className="cargando">Cargando la revisión…</p>

  if (!pendiente(carga)) {
    const guardada = carga.estado === 'validada'
    return (
      <>
        <div>
          <h1>{carga.nombre_archivo}</h1>
          <p className="sub">
            {guardada
              ? `Esta carga ya se guardó: ${plural(carga.filas_validas, 'venta')} ${periodoTexto(carga.periodo)}.`
              : 'Esta carga se descartó y no se guardó ninguna venta.'}
          </p>
        </div>
        <Link className="btn alt" to="/cargar" style={{ justifySelf: 'start' }}>
          Volver a Cargar ventas
        </Link>
      </>
    )
  }

  const hayErrores = errores.length > 0
  const periodo = periodoTexto(carga.periodo)

  return (
    <>
      <div>
        <h1>Revisamos tu archivo</h1>
        <p className="sub">
          {carga.nombre_archivo} · {plural(carga.filas_totales, 'fila')}.{' '}
          {!hayErrores && '¡Todo está bien! Ya puedes guardarlo.'}
          {hayErrores && carga.filas_validas > 0 && `Casi todo está bien; hay ${plural(carga.filas_con_error, 'fila')} que necesitan una mirada.`}
          {hayErrores && carga.filas_validas === 0 && 'Ninguna fila se pudo leer bien. Revisa los errores y vuelve a subirlo.'}
        </p>
      </div>
      <PasosCarga actual={2} />

      <div className="grid2">
        <section className="card stack">
          <div className="row between">
            <h2>{hayErrores ? 'Qué hay que arreglar' : 'Sin errores'}</h2>
            {hayErrores && (
              <button className="btn alt sm" type="button" onClick={bajarErrores}>
                Descargar la lista de errores
              </button>
            )}
          </div>

          {!hayErrores && <p className="aviso exito">Revisamos todas las filas y no encontramos ningún problema.</p>}

          {porColumna.length > 1 && (
            <p className="sub sin-margen">
              Dónde están:{' '}
              {porColumna.map(([col, n], i) => (
                <span key={col}>
                  {i > 0 && ' · '}
                  <code className="columna">{nombreColumna(col)}</code> {n}
                </span>
              ))}
            </p>
          )}

          {errores.slice(0, mostrar).map((e, i) => (
            <div className="err" key={`${e.fila}-${e.columna}-${i}`}>
              <div className="w">
                Fila {numero(e.fila)} · {nombreColumna(e.columna)}
                {e.valor ? ` · «${e.valor}»` : ''}
              </div>
              <div>{sinFila(e.mensaje)}</div>
              {e.sugerencia && <div className="fix">{e.sugerencia}</div>}
            </div>
          ))}

          {errores.length > mostrar && (
            <button className="btn alt sm" type="button" onClick={() => setMostrar(mostrar + POR_PAGINA)} style={{ justifySelf: 'start' }}>
              Ver {Math.min(POR_PAGINA, errores.length - mostrar)} más (quedan {numero(errores.length - mostrar)})
            </button>
          )}
        </section>

        <div className="stack">
          <div className="grid2" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="card kpi">
              <div className="lab">Filas listas</div>
              <div className="val bien">{numero(carga.filas_validas)}</div>
            </div>
            <div className="card kpi">
              <div className="lab">Por revisar</div>
              <div className={`val ${carga.filas_con_error ? 'mal' : 'bien'}`}>{numero(carga.filas_con_error)}</div>
            </div>
          </div>

          {(periodo || carga.columnas_ignoradas?.length > 0) && (
            <section className="card">
              <h2>También encontramos</h2>
              {periodo && <p className="sub sin-margen">Ventas {periodo}.</p>}
              {carga.columnas_ignoradas?.length > 0 && (
                <p className="sub sin-margen">
                  {carga.columnas_ignoradas.length === 1 ? 'Una columna que no usamos' : 'Columnas que no usamos'}:{' '}
                  {carga.columnas_ignoradas.map((c, i) => (
                    <span key={c}>
                      {i > 0 && ', '}
                      <code className="columna">{c}</code>
                    </span>
                  ))}
                  . No pasa nada: simplemente no la tenemos en cuenta.
                </p>
              )}
            </section>
          )}

          <section className="card acciones">
            <h2>¿Qué quieres hacer?</h2>
            {/* Advertencias (observación O5): van antes del botón Guardar para leerlas antes de decidir */}
            {carga.advertencias?.length > 0 && (
              <div className="aviso advertencia" role="status">
                <strong>Antes de guardar, revisa esto:</strong>
                <ul>
                  {carga.advertencias.map((a, i) => (
                    <li key={a.tipo || i}>{typeof a === 'string' ? a : a.mensaje}</li>
                  ))}
                </ul>
              </div>
            )}
            {carga.filas_validas > 0 && (
              <button className="btn" type="button" onClick={guardar} disabled={Boolean(ocupado)}>
                {ocupado === 'guardar' ? 'Guardando…' : textoGuardar(carga.filas_validas, hayErrores)}
              </button>
            )}

            {!seguroDescartar ? (
              <button className="btn alt" type="button" onClick={() => setSeguroDescartar(true)} disabled={Boolean(ocupado)}>
                Descartar y subir otro archivo
              </button>
            ) : (
              <div className="aviso info stack" style={{ gap: 8 }}>
                <span>¿Seguro? No se guardará ninguna venta de este archivo.</span>
                <div className="row">
                  <button className="btn sm" type="button" onClick={descartar} disabled={Boolean(ocupado)}>
                    {ocupado === 'descartar' ? 'Descartando…' : 'Sí, descartar'}
                  </button>
                  <button className="btn sm alt" type="button" onClick={() => setSeguroDescartar(false)} disabled={Boolean(ocupado)}>
                    No, volver
                  </button>
                </div>
              </div>
            )}

            {errorAccion && (
              <p className="aviso error" role="alert">
                {errorAccion}
              </p>
            )}

            {hayErrores && carga.filas_validas > 0 && (
              <p className="sub sin-margen" style={{ fontSize: '.85rem' }}>
                {carga.filas_con_error === 1
                  ? 'La fila con error no se guarda. Descarga la lista para corregirla en tu archivo.'
                  : `Las ${numero(carga.filas_con_error)} filas con error no se guardan. Descarga la lista para corregirlas en tu archivo.`}
              </p>
            )}
          </section>
        </div>
      </div>
    </>
  )
}
