import { useEffect, useState } from 'react'
import { productosQueVanJuntos } from '../api/cliente.js'
import { useSesion } from '../sesion/contexto.js'
import SinVentas from '../components/SinVentas.jsx'
import { numero, periodoTexto, plural } from '../formato.js'
import './VanJuntos.css'

const POCAS_COMPRAS = 5 // con menos compras juntas, la pareja puede ser casualidad

// "De cada 10" si las dos cifras se leen bien así; si no, "de cada 100" (para porcentajes pequeños)
function deCada(confianza, general) {
  const en10 = [Math.round(confianza / 10), Math.round(general / 10)]
  if (en10[1] >= 1 && en10[0] > en10[1]) return { base: 10, a: en10[0], b: en10[1] }
  return { base: 100, a: Math.round(confianza), b: Math.max(1, Math.round(general)) }
}

// Cómo se explica el lift en palabras (O1): mayor que 1, van juntos; cerca de 1, sin relación; menor que 1, se evitan
function comparacion(lift) {
  if (lift >= 1.95) return { texto: `${numero(Math.round(lift * 10) / 10)} veces más de lo normal`, clase: 'good' }
  if (lift > 1.1) return { texto: `${Math.round((lift - 1) * 100)} % más de lo normal`, clase: 'good' }
  if (lift >= 0.9) return { texto: 'Sin relación: es casualidad', clase: 'c' }
  return { texto: 'Se evitan: casi no se compran juntos', clase: 'bad' }
}

// De cada pareja llegan dos reglas (A→B y B→A) con el mismo lift: se muestra la de mayor confianza
function parejas(asociaciones) {
  const vistas = new Map()
  for (const a of asociaciones) {
    const clave = [a.producto_origen, a.producto_destino].sort().join('|')
    const antes = vistas.get(clave)
    if (!antes || a.confianza > antes.confianza) vistas.set(clave, a)
  }
  return [...vistas.values()].sort((x, y) => y.lift - x.lift || y.confianza - x.confianza)
}

// P11 · Productos que van juntos (RF-11, observación O1). Ruta GET /indicadores/asociaciones (Bianca).
export default function VanJuntos() {
  const { token } = useSesion()
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState('')
  const [verPocas, setVerPocas] = useState(false)

  useEffect(() => {
    let activo = true
    productosQueVanJuntos(token, { limite: 20 })
      .then((r) => activo && setDatos(r))
      .catch((err) => activo && setError(err.mensaje))
    return () => {
      activo = false
    }
  }, [token])

  const titulo = (texto) => (
    <div>
      <h1>Productos que van juntos</h1>
      <p className="sub">{texto}</p>
    </div>
  )

  if (error) {
    return (
      <>
        {titulo('Qué productos se compran juntos más de lo normal.')}
        <p className="aviso error" role="alert">
          {error}
        </p>
      </>
    )
  }
  if (!datos) return <p className="cargando">Buscando qué se compra junto…</p>
  if (datos.sin_datos) {
    return (
      <>
        {titulo('Qué productos se compran juntos más de lo normal.')}
        <SinVentas />
      </>
    )
  }

  const todas = parejas(datos.asociaciones || []).filter((a) => a.lift > 1.1)
  // Primero las parejas con suficientes compras; las de pocas compras se ven solo si la persona quiere
  const fuertes = todas.filter((a) => a.compras_conjuntas >= POCAS_COMPRAS)
  const pocas = todas.filter((a) => a.compras_conjuntas < POCAS_COMPRAS)
  const lista = verPocas ? [...fuertes, ...pocas] : fuertes

  return (
    <>
      {titulo(
        `Lo calculamos con los tickets ${periodoTexto(datos.periodo)} (${plural(datos.total_transacciones, 'compra')}).`,
      )}

      <div className="grid2">
        <section className="card">
          <h2>Las parejas más fuertes</h2>
          {todas.length === 0 ? (
            <p className="aviso info">
              Todavía no encontramos productos que se compren juntos más de lo normal. Revisa que tu archivo traiga el número de
              ticket (id_ticket).
            </p>
          ) : (
            <>
              <p className="sub sin-margen">
                Cada pareja compara dos cosas: cuántos de los que llevan el primero llevan también el segundo (barra naranja) y
                cuántos lo llevan en general (barra gris).
              </p>
              <ul className="juntos-lista">
                {lista.map((a) => {
                  const general = a.lift ? a.confianza / a.lift : 0
                  const { base, a: conPrimero, b: enGeneral } = deCada(a.confianza, general)
                  const c = comparacion(a.lift)
                  return (
                    <li key={`${a.producto_origen}|${a.producto_destino}`} className="juntos">
                      <div className="juntos-arriba">
                        <p className="sin-margen">
                          De cada {base} clientes que llevan <b>{a.producto_origen}</b>,{' '}
                          <b>
                            {numero(conPrimero)} llevan {a.producto_destino}
                          </b>
                          ; en general, solo <b>{numero(enGeneral)} de cada {base}</b> lo llevan.
                        </p>
                        <span className={`pill ${c.clase}`}>{c.texto}</span>
                      </div>
                      <div className="juntos-barras" aria-hidden="true">
                        <span className="hbar m">
                          <span style={{ width: `${Math.min(100, a.confianza)}%` }} />
                        </span>
                        <span className="hbar gris">
                          <span style={{ width: `${Math.min(100, general)}%` }} />
                        </span>
                      </div>
                      <small className="sub">
                        Se compraron juntos en {plural(a.compras_conjuntas, 'ticket')}
                        {a.compras_conjuntas < POCAS_COMPRAS ? ' · son pocas compras: tómalo con cuidado' : ''}.
                      </small>
                    </li>
                  )
                })}
              </ul>
              {pocas.length > 0 && (
                <button type="button" className="enlace" onClick={() => setVerPocas(!verPocas)}>
                  {verPocas
                    ? 'Ocultar las parejas con pocas compras'
                    : `Ver ${pocas.length === 1 ? '1 pareja' : `${numero(pocas.length)} parejas`} con pocas compras`}
                </button>
              )}
            </>
          )}
        </section>

        <div className="stack">
          <section className="card tip">
            <h2>Qué puedes hacer con esto</h2>
            <p className="sub sin-margen">
              Pon esos productos cerca, arma un combo o, cuando alguien pida el primero, pregúntale si le falta el segundo.
            </p>
          </section>
          <section className="card">
            <h2>Cómo lo sabemos</h2>
            <p className="sub sin-margen">
              Revisamos qué productos aparecen en el mismo ticket. «6 de cada 10 que llevan pan también llevan leche» no basta: si
              casi todos tus clientes llevan leche, no significa nada. Por eso lo comparamos con cuántos la llevan en general. Si
              es más que lo habitual, van juntos; si es igual, es casualidad; si es menos, se evitan. Que vayan juntos no quiere
              decir que uno cause el otro.
            </p>
            <p className="sub sin-margen juntos-tecnico">
              En términos técnicos: la primera cifra es la confianza y la comparación con lo habitual es el lift (mayor que 1: van
              juntos; 1: sin relación; menor que 1: se evitan).
            </p>
          </section>
        </div>
      </div>
    </>
  )
}
