import { useEffect, useState } from 'react'
import { pronosticoVentas } from '../api/cliente.js'
import { pesos, pesosCortos } from '../formato.js'
import './TarjetaPronostico.css'

// Cómo se le explica al tendero cada nivel de confianza
const CONFIANZA = {
  alta: { texto: 'Confianza alta', clase: 'good', ayuda: 'Con tus ventas pasadas, este cálculo acertó bastante.' },
  media: { texto: 'Confianza media', clase: 'warn', ayuda: 'Úsalo como guía; puede variar.' },
  baja: { texto: 'Confianza baja', clase: 'bad', ayuda: 'Tus ventas cambian mucho: tómalo solo como una idea.' },
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
// "2026-10-05" -> "5 oct"
const diaCorto = (f) => `${Number(f.slice(8, 10))} ${MESES[Number(f.slice(5, 7)) - 1]}`

// P02 · Pronóstico de las próximas 4 semanas (RF-09, RNF-07). Ruta 19, pendiente de confirmar con Emmanuel.
// Muestra, para la categoría elegida: valor y rango de cada semana, nivel de confianza, qué modelo se usó y por qué,
// y de qué ejecución y versión del modelo sale (observaciones O3 y O4 del profesor).
export default function TarjetaPronostico({ token }) {
  const [respuesta, setRespuesta] = useState(null)
  const [fallo, setFallo] = useState(false)
  const [elegida, setElegida] = useState(0)

  useEffect(() => {
    let activo = true
    pronosticoVentas(token)
      .then((r) => activo && setRespuesta(r))
      .catch(() => activo && setFallo(true))
    return () => {
      activo = false
    }
  }, [token])

  const titulo = <h2>Pronóstico de las próximas 4 semanas</h2>

  // La ruta todavía no existe o falló: la página sigue funcionando y se avisa con calma
  if (fallo) {
    return (
      <section className="card pronostico">
        {titulo}
        <p className="sub sin-margen">El pronóstico todavía no está disponible. Vuelve a mirar más tarde.</p>
      </section>
    )
  }
  if (!respuesta) {
    return (
      <section className="card pronostico">
        {titulo}
        <p className="sub sin-margen">Calculando tu pronóstico…</p>
      </section>
    )
  }
  // No hay suficientes semanas: mensaje claro en vez de cifras
  if (respuesta.sin_datos || !respuesta.series?.length) {
    return (
      <section className="card pronostico">
        {titulo}
        <p className="aviso info sin-margen">
          {respuesta.mensaje || 'Todavía no tenemos suficientes semanas de ventas para pronosticar.'}
        </p>
      </section>
    )
  }

  const serie = respuesta.series[Math.min(elegida, respuesta.series.length - 1)]
  const nivel = CONFIANZA[serie.confianza] || CONFIANZA.baja
  const semanas = serie.pronostico || []
  // Escala común para las 4 barras: de $0 al valor más alto (+5 %), así se ve qué tan ancho es cada rango
  const maximo = Math.max(...semanas.map((s) => s.alto)) * 1.05 || 1
  const pos = (v) => `${(Math.max(v, 0) / maximo) * 100}%`

  return (
    <section className="card pronostico">
      <div className="row between">
        {titulo}
        <span className={`pill ${nivel.clase}`}>{nivel.texto}</span>
      </div>

      {respuesta.series.length > 1 && (
        <label className="selector">
          <span className="oculto">Ver pronóstico de</span>
          <select value={elegida} onChange={(e) => setElegida(Number(e.target.value))}>
            {respuesta.series.map((s, i) => (
              <option key={s.categoria} value={i}>
                {s.categoria}
              </option>
            ))}
          </select>
        </label>
      )}

      <p className="sub sin-margen">
        Lo más probable para cada semana, y entre qué valores debería quedar. {nivel.ayuda}
      </p>

      <ul className="pronostico-semanas">
        {semanas.map((s) => (
          <li key={s.semana_inicio}>
            <span className="pronostico-fechas">
              {diaCorto(s.semana_inicio)} – {diaCorto(s.semana_fin)}
            </span>
            <span className="pronostico-valor">{pesos(s.valor)}</span>
            <span className="pronostico-rango" aria-hidden="true">
              <span className="pronostico-banda" style={{ left: pos(s.bajo), right: `calc(100% - ${pos(s.alto)})` }} />
              <span className="pronostico-punto" style={{ left: pos(s.valor) }} />
            </span>
            <span className="pronostico-entre">
              entre {pesosCortos(s.bajo)} y {pesosCortos(s.alto)}
            </span>
          </li>
        ))}
      </ul>

      <p className="pronostico-frase sin-margen">{serie.frase}</p>
      <p className="pronostico-origen sin-margen">
        Ejecución #{respuesta.id_ejecucion ?? '—'} · modelo v{respuesta.version_modelo?.version ?? '—'} · {serie.modelo_nombre}
      </p>
    </section>
  )
}
