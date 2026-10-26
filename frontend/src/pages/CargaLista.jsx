import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { verCarga } from '../api/cliente.js'
import { useSesion } from '../sesion/contexto.js'
import PasosCarga from '../components/PasosCarga.jsx'
import { numero, periodoTexto, pesos, plural } from '../formato.js'
import './Carga.css'

const MAX_PRODUCTOS = 8

// P05 · Carga confirmada (RF-02, RF-03). Muestra la respuesta de la ruta 11 (confirmar).
// Si se recarga la página, ya no está esa respuesta; entonces se muestra lo básico con la ruta 10.
export default function CargaLista() {
  const { id } = useParams()
  const { token, usuario } = useSesion()
  const { state } = useLocation()
  const resultado = state?.resultado
  const [carga, setCarga] = useState(null)
  const [error, setError] = useState('')
  const nombre = usuario.nombre.trim().split(/\s+/)[0]

  useEffect(() => {
    if (resultado) return
    let activo = true
    verCarga(token, id)
      .then((c) => activo && setCarga(c))
      .catch((err) => activo && setError(err.mensaje))
    return () => {
      activo = false
    }
  }, [token, id, resultado])

  const botones = (
    <div className="row">
      <Link className="btn" to="/inicio">
        Ver mi resumen
      </Link>
      <Link className="btn alt" to="/cargar">
        Cargar otro archivo
      </Link>
    </div>
  )

  if (!resultado) {
    if (error) {
      return (
        <>
          <p className="aviso error" role="alert">
            {error}
          </p>
          {botones}
        </>
      )
    }
    if (!carga) return <p className="cargando">Cargando…</p>
    return (
      <>
        <PasosCarga actual={3} />
        <section className="card ok">
          <h1>{carga.estado === 'validada' ? `Esta carga ya está guardada, ${nombre}` : 'Esta carga todavía no se ha guardado'}</h1>
          <p className="sub sin-margen">
            {carga.nombre_archivo} · {plural(carga.filas_validas, 'venta')} {periodoTexto(carga.periodo)}.
          </p>
        </section>
        {botones}
      </>
    )
  }

  const { catalogo_nuevo: nuevo } = resultado
  // Las descartadas son las filas con error más las de tickets que ya estaban guardados
  const conError = Math.min(state.filas_con_error ?? 0, resultado.filas_descartadas)
  const repetidas = resultado.filas_descartadas - conError
  const periodo = periodoTexto(resultado.periodo)
  const hayCatalogo = nuevo.productos.length > 0 || nuevo.categorias.length > 0 || nuevo.clientes > 0

  return (
    <>
      <PasosCarga actual={3} />
      <section className="card ok">
        <h1>
          {resultado.ventas_guardadas > 0
            ? `¡Listo, ${nombre}! Guardamos ${plural(resultado.ventas_guardadas, 'venta')}`
            : `${nombre}, no había ventas nuevas para guardar`}
        </h1>
        <p className="sub sin-margen">
          {resultado.ventas_guardadas > 0
            ? `${state.nombre_archivo || 'Tu archivo'} quedó guardado${periodo ? `, con ventas ${periodo}` : ''}. Con esto se actualizan tu resumen y tu tablero.`
            : 'Todas las filas buenas de este archivo ya estaban guardadas de una carga anterior, así que no las contamos dos veces.'}
        </p>
      </section>

      <div className="grid3">
        <section className="card">
          <h2>Lo que se vendió en el archivo</h2>
          <div className="cifra-total">{pesos(resultado.total_vendido)}</div>
          <p className="sub sin-margen">
            Suma de cantidad × precio, menos descuentos, de las {plural(resultado.ventas_guardadas, 'fila')} guardadas.
          </p>
        </section>

        <section className="card">
          <h2>Se sumó a tu catálogo</h2>
          {!hayCatalogo && <p className="sub sin-margen">Nada nuevo: todos los productos ya estaban en tu catálogo.</p>}
          {nuevo.productos.length > 0 && (
            <ul className="sub lista">
              {nuevo.productos.slice(0, MAX_PRODUCTOS).map((p) => (
                <li key={p.codigo}>
                  {p.nombre} · {p.categoria}
                </li>
              ))}
              {nuevo.productos.length > MAX_PRODUCTOS && <li>y {numero(nuevo.productos.length - MAX_PRODUCTOS)} productos más</li>}
            </ul>
          )}
          {nuevo.categorias.length > 0 && (
            <p className="sub sin-margen">
              {nuevo.categorias.length === 1 ? 'Categoría nueva' : 'Categorías nuevas'}: {nuevo.categorias.join(', ')}.
            </p>
          )}
          {nuevo.clientes > 0 && (
            <p className="sub sin-margen">{plural(nuevo.clientes, 'cliente nuevo', 'clientes nuevos')}, guardados solo con su código.</p>
          )}
        </section>

        <section className="card">
          <h2>{resultado.filas_descartadas > 0 ? 'Quedó por fuera' : 'No quedó nada por fuera'}</h2>
          <p className="sub sin-margen">
            {resultado.filas_descartadas === 0 && 'Todas las filas del archivo se guardaron.'}
            {conError > 0 && `${plural(conError, 'fila')} con errores no se ${conError === 1 ? 'guardó' : 'guardaron'}. `}
            {repetidas > 0 &&
              `${plural(repetidas, 'fila')} ya ${repetidas === 1 ? 'estaba guardada' : 'estaban guardadas'} de una carga anterior (mismo ticket y fecha), así que no se contaron dos veces.`}
          </p>
        </section>
      </div>

      {botones}
    </>
  )
}
