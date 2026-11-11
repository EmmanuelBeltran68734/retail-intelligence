import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listarCargas, resumenIndicadores, serieVentas } from '../api/cliente.js'
import { useSesion } from '../sesion/contexto.js'
import { useMesesConVentas } from '../indicadores/meses.js'
import GraficoVentas from '../components/GraficoVentas.jsx'
import Cambio from '../components/Cambio.jsx'
import SinVentas from '../components/SinVentas.jsx'
import TarjetaPronostico from '../components/TarjetaPronostico.jsx'
import { finDeMes, periodoAnterior, sumarDias } from '../fechas.js'
import { diaYNumero, fechaCorta, nombreMes, numero, periodoTexto, pesos, porcentaje } from '../formato.js'
import './Tablero.css'

function saludo() {
  const hora = new Date().getHours()
  if (hora < 12) return 'Buenos días'
  if (hora < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

const mejor = (puntos) => puntos.reduce((a, p) => (p.ventas > a.ventas ? p : a), puntos[0])
const peor = (puntos) => puntos.reduce((a, p) => (p.ventas < a.ventas ? p : a), puntos[0])

// P02 · Inicio: resumen del mes (RF-05, RF-06). Rutas 16 (resumen), 17 (series) y 9 (última carga).
export default function Inicio() {
  const { token, usuario } = useSesion()
  const meses = useMesesConVentas(token)
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState('')
  const [vista, setVista] = useState('semanas')
  const nombre = usuario.nombre.trim().split(/\s+/)[0]
  const mes = meses.porDefecto

  useEffect(() => {
    if (!mes) return
    let activo = true
    const desde = mes
    const hasta = finDeMes(mes)
    Promise.all([
      resumenIndicadores(token, { desde, hasta }),
      serieVentas(token, 'dia', { desde, hasta }),
      serieVentas(token, 'dia_semana', { desde, hasta }),
      serieVentas(token, 'semana', { desde: sumarDias(hasta, -55), hasta }),
      // Las 8 semanas de antes, para la opción "Comparar"
      serieVentas(token, 'semana', periodoAnterior(sumarDias(hasta, -55), hasta)),
      listarCargas(token).catch(() => []),
    ])
      .then(([resumen, dias, diasSemana, semanas, semanasAntes, cargas]) => {
        if (!activo) return
        setDatos({
          resumen,
          dias: dias.puntos,
          diasSemana: diasSemana.puntos,
          semanas: semanas.puntos,
          semanasAntes: semanasAntes.puntos || [],
          ultimaCarga: cargas.find((c) => c.estado === 'validada'),
        })
      })
      .catch((err) => activo && setError(err.mensaje))
    return () => {
      activo = false
    }
  }, [token, mes])

  const encabezado = (texto) => (
    <div>
      <h1>
        {saludo()}, {nombre}
      </h1>
      <p className="sub">{texto}</p>
    </div>
  )

  if (meses.error || error) {
    return (
      <>
        {encabezado('Así le va a tu tienda.')}
        <p className="aviso error" role="alert">
          {meses.error || error}
        </p>
      </>
    )
  }
  if (meses.sinDatos) {
    return (
      <>
        {encabezado(`Bienvenida a Retail Intelligence. Aquí verás cómo le va a ${usuario.comercio.nombre}.`)}
        <SinVentas />
      </>
    )
  }
  if (!datos) return <p className="cargando">Preparando tu resumen…</p>

  const { resumen, dias, diasSemana, semanas, semanasAntes, ultimaCarga } = datos
  const nombreDelMes = nombreMes(mes)
  const diaTop = mejor(dias)
  const diaFlojo = peor(diasSemana)
  const diasConVentas = dias.filter((d) => d.transacciones > 0).length || 1
  const semanaTop = mejor(semanas)
  const iMes = meses.puntos.findIndex((p) => p.inicio === mes)
  const inicioVentana = Math.max(0, iMes - 5)
  const ultimosMeses = meses.puntos.slice(inicioVentana, iMes + 1)
  // Los meses de antes solo sirven para comparar si hay la misma cantidad
  const mesesAntes = meses.puntos.slice(Math.max(0, inicioVentana - ultimosMeses.length), inicioVentana)
  const hayMesesAntes = mesesAntes.length === ultimosMeses.length

  return (
    <>
      {encabezado(
        `Así le fue a ${usuario.comercio.nombre} en ${nombreDelMes}. Te lo contamos en palabras sencillas; los detalles están en el tablero.`,
      )}

      <div className="grid2">
        <div className="stack">
          <section className="card hero">
            <div className="lab">Vendiste en {nombreDelMes}</div>
            <div className="big">{pesos(resumen.ventas_totales.valor)}</div>
            <Cambio valor={resumen.crecimiento.valor} />
            <p className="say">
              {resumen.crecimiento.frase}{' '}
              {diaTop.ventas > 0 &&
                `Tu mejor día fue el ${diaYNumero(diaTop.inicio)}: entraron ${pesos(diaTop.ventas)} en ${numero(diaTop.transacciones)} compras.`}
            </p>
          </section>

          <div className="grid3">
            <div className="card kpi">
              <div className="lab">Ticket promedio</div>
              <div className="val">{pesos(resumen.ticket_promedio.valor)}</div>
              <div className="exp">Lo que gasta cada cliente por compra, en promedio.</div>
            </div>
            <div className="card kpi">
              <div className="lab">Compras</div>
              <div className="val">{numero(resumen.transacciones.valor)}</div>
              <div className="exp">
                Unas {numero(Math.round(resumen.transacciones.valor / diasConVentas))} al día. Los{' '}
                {diaFlojo.etiqueta.endsWith('s') ? diaFlojo.etiqueta : `${diaFlojo.etiqueta}s`} son los más flojos.
              </div>
            </div>
            <div className="card kpi">
              <div className="lab">Tus {resumen.concentracion.top_productos} productos estrella</div>
              <div className="val">{porcentaje(resumen.concentracion.valor)}</div>
              <div className="exp">de todo lo que vendes sale de ellos.</div>
            </div>
          </div>

          <TarjetaPronostico token={token} />

          <div className="row">
            <Link className="btn" to="/tablero">
              Ver el tablero completo
            </Link>
            <Link className="btn alt" to="/cargar">
              Cargar ventas nuevas
            </Link>
          </div>
        </div>

        <div className="stack">
          <section className="card">
            <div className="row between">
              <h2>{vista === 'semanas' ? 'Tus últimas 8 semanas' : 'Tus últimos meses'}</h2>
              <div className="seg seg-sm" role="group" aria-label="Ver por">
                <button type="button" aria-pressed={vista === 'semanas'} onClick={() => setVista('semanas')}>
                  Semanas
                </button>
                <button type="button" aria-pressed={vista === 'meses'} onClick={() => setVista('meses')}>
                  Meses
                </button>
              </div>
            </div>
            <p className="sub sin-margen">Pasa el mouse por las barras. La naranja es la más alta; la línea punteada, el promedio.</p>
            {vista === 'semanas' ? (
              <GraficoVentas
                key="semanas"
                puntos={semanas}
                anteriores={semanasAntes}
                nombreAnterior="las 8 semanas anteriores"
                alto={210}
                conMetricas={false}
                unidad="semana"
                descripcion={`Ventas de las últimas 8 semanas. La mejor fue ${semanaTop.etiqueta}, con ${pesos(semanaTop.ventas)}.`}
              />
            ) : (
              <GraficoVentas
                key="meses"
                puntos={ultimosMeses}
                anteriores={hayMesesAntes ? mesesAntes : null}
                nombreAnterior={`los ${ultimosMeses.length} meses anteriores`}
                alto={210}
                conMetricas={false}
                unidad="mes"
                descripcion={`Ventas de los últimos ${ultimosMeses.length} meses.`}
              />
            )}
          </section>

          <section className="card tip">
            <h2>Un consejo para esta semana</h2>
            <p className="sub sin-margen">
              Sube tus ventas el lunes en la mañana. Así el resumen te queda listo antes de llamar al proveedor.
            </p>
          </section>

          {ultimaCarga && (
            <section className="card">
              <h2>Tu última carga</h2>
              <p className="sub sin-margen">
                {ultimaCarga.nombre_archivo} · {fechaCorta(ultimaCarga.creada_en)} · {numero(ultimaCarga.filas_validas)}{' '}
                ventas {periodoTexto(ultimaCarga.periodo)}.
              </p>
            </section>
          )}
        </div>
      </div>

      {meses.ultimaVenta > finDeMes(mes) && (
        <p className="sub sin-margen" style={{ fontSize: '.85rem' }}>
          Te mostramos {nombreDelMes} porque es el último mes completo. Tus ventas llegan hasta el {diaYNumero(meses.ultimaVenta)}{' '}
          de {nombreMes(meses.ultimaVenta)}; en el tablero puedes ver ese mes también.
        </p>
      )}
    </>
  )
}
