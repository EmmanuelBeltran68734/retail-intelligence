import { Fragment, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { USAR_DATOS_FALSOS, listarCargas, subirCarga } from '../api/cliente.js'
import { useSesion } from '../sesion/contexto.js'
import PasosCarga from '../components/PasosCarga.jsx'
import BotonesPlantilla from '../components/BotonesPlantilla.jsx'
import { ESTADOS, pendiente } from '../estadosCarga.js'
import { fechaCorta, numero, periodoCorto } from '../formato.js'
import { TAMANO_MAXIMO, archivoEjemplo } from '../plantilla.js'
import './Carga.css'

// El archivo de ejemplo (con errores a propósito) solo se ofrece mientras desarrollamos o con datos falsos,
// para que nadie guarde ventas de mentira en su tienda real.
const MOSTRAR_EJEMPLO = USAR_DATOS_FALSOS || import.meta.env.DEV

// Revisión rápida en el navegador, antes de subir (el backend vuelve a revisar todo)
function problemaDelArchivo(archivo) {
  if (!/\.(csv|xlsx)$/i.test(archivo.name)) {
    return /\.xls$/i.test(archivo.name)
      ? 'Ese es un Excel antiguo (.xls). Ábrelo en Excel y guárdalo como .xlsx, o como CSV.'
      : 'Solo sirven archivos .csv o Excel (.xlsx).'
  }
  if (archivo.size === 0) return 'El archivo está vacío.'
  if (archivo.size > TAMANO_MAXIMO) return 'El archivo pesa más de 5 MB. Divide las ventas en varios archivos (por ejemplo, uno por mes).'
  return ''
}

// P03 · Cargar ventas (RF-02). Rutas 8 (subir) y 9 (historial).
export default function CargarVentas() {
  const { token } = useSesion()
  const navegar = useNavigate()
  const [subiendo, setSubiendo] = useState('')
  const [error, setError] = useState(null)
  const [encima, setEncima] = useState(false)
  const [cargas, setCargas] = useState(null)
  const [errorHistorial, setErrorHistorial] = useState('')

  // Ruta 9: GET /cargas
  useEffect(() => {
    let activo = true
    listarCargas(token)
      .then((lista) => activo && setCargas(lista))
      .catch((err) => activo && setErrorHistorial(err.mensaje))
    return () => {
      activo = false
    }
  }, [token])

  // Ruta 8: POST /cargas
  async function subir(archivo) {
    if (!archivo || subiendo) return
    setError(null)
    const problema = problemaDelArchivo(archivo)
    if (problema) {
      setError({ mensaje: problema })
      return
    }
    setSubiendo(archivo.name)
    try {
      const carga = await subirCarga(token, archivo)
      navegar(`/cargar/${carga.id}`, { state: { carga } })
    } catch (err) {
      setError({ mensaje: err.mensaje, faltan: err.faltan })
      setSubiendo('')
    }
  }

  function alSoltar(e) {
    e.preventDefault()
    setEncima(false)
    subir(e.dataTransfer.files?.[0])
  }

  return (
    <>
      <div>
        <h1>Cargar ventas</h1>
        <p className="sub">
          Sube el archivo donde pasaste tus ventas. Antes de analizar nada lo revisamos contigo, fila por fila.
        </p>
      </div>
      <PasosCarga actual={1} />

      <div className="grid2">
        <div className="stack">
          <label
            className={`drop${encima ? ' encima' : ''}${subiendo ? ' ocupado' : ''}`}
            htmlFor="archivo-ventas"
            onDragOver={(e) => {
              e.preventDefault()
              setEncima(true)
            }}
            onDragLeave={() => setEncima(false)}
            onDrop={alSoltar}
          >
            <input
              id="archivo-ventas"
              type="file"
              accept=".csv,.xlsx"
              disabled={Boolean(subiendo)}
              onChange={(e) => {
                subir(e.target.files?.[0])
                e.target.value = '' // para poder elegir el mismo archivo otra vez
              }}
            />
            {subiendo ? (
              <>
                <span className="girando" aria-hidden="true" />
                <span className="drop-titulo" role="status">
                  Revisando {subiendo}…
                </span>
                <span className="sub">Esto puede tardar unos segundos si el archivo es grande.</span>
              </>
            ) : (
              <>
                <span className="drop-titulo">Arrastra aquí tu archivo o haz clic para buscarlo</span>
                <span className="sub">
                  Sirven CSV o Excel (.xlsx) con la plantilla de Retail Intelligence, de máximo 5 MB. Si lo exportas de tu
                  caja registradora, también sirve.
                </span>
                <span className="btn" aria-hidden="true">
                  Elegir archivo
                </span>
              </>
            )}
          </label>

          {error && (
            <div className="aviso error" role="alert">
              <p className="sin-margen">{error.mensaje}</p>
              {error.faltan?.length > 0 && (
                <p className="sin-margen" style={{ marginTop: 6 }}>
                  Agrega estas columnas:{' '}
                  {error.faltan.map((c, i) => (
                    <Fragment key={c}>
                      {i > 0 && ', '}
                      <code className="columna">{c}</code>
                    </Fragment>
                  ))}
                  .{' '}
                  <Link to="/guia-plantilla">Ver cómo se llena la plantilla</Link>
                </p>
              )}
            </div>
          )}

          <div className="row">
            {MOSTRAR_EJEMPLO && (
              <button className="btn" type="button" onClick={() => subir(archivoEjemplo())} disabled={Boolean(subiendo)}>
                Probar con el archivo de ejemplo
              </button>
            )}
            <Link className="btn alt" to="/guia-plantilla">
              ¿Cómo lleno la plantilla?
            </Link>
          </div>

          <section className="card">
            <h2>Cargas anteriores</h2>
            {errorHistorial && (
              <p className="aviso error" role="alert">
                {errorHistorial}
              </p>
            )}
            {!cargas && !errorHistorial && <p className="sub">Cargando…</p>}
            {cargas?.length === 0 && <p className="sub">Todavía no has subido ningún archivo. ¡El primero es el más importante!</p>}
            {cargas?.length > 0 && (
              <div className="scroll">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Archivo</th>
                      <th>Subido</th>
                      <th>Período</th>
                      <th className="n">Ventas</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cargas.map((c) => {
                      const estado = ESTADOS[c.estado] || { texto: c.estado, clase: 'c' }
                      const destino = pendiente(c) ? `/cargar/${c.id}` : null
                      return (
                        <tr key={c.id} className={destino ? 'clic' : ''} onClick={destino ? () => navegar(destino) : undefined}>
                          <td>
                            {destino ? (
                              <button
                                type="button"
                                className="enlace"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  navegar(destino)
                                }}
                              >
                                {c.nombre_archivo}
                              </button>
                            ) : (
                              c.nombre_archivo
                            )}
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>{fechaCorta(c.creada_en)}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>{periodoCorto(c.periodo) || '—'}</td>
                          <td className="n">{c.estado === 'rechazada' ? '—' : numero(c.filas_validas)}</td>
                          <td>
                            <span className={`pill ${estado.clase}`}>{estado.texto}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <div className="stack">
          <section className="card tip">
            <h2>¿Primera vez?</h2>
            <p className="sub sin-margen">
              Descarga la plantilla: trae tres filas de ejemplo para que veas cómo se llena. Con fecha, producto, cantidad y
              precio ya podemos empezar.
            </p>
            <BotonesPlantilla />
          </section>
          <section className="card">
            <h2>Tus datos están seguros</h2>
            <p className="sub sin-margen">
              Solo tú y las personas que invites pueden verlos. No pedimos nombres ni cédulas de tus clientes.
            </p>
          </section>
        </div>
      </div>
    </>
  )
}
