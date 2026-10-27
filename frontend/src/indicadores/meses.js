import { useEffect, useState } from 'react'
import { serieVentas } from '../api/cliente.js'
import { finDeMes } from '../fechas.js'
import { nombreMes } from '../formato.js'

// Los meses en que la tienda tiene ventas (ruta 17 con agrupar=mes desde el principio)
// y cuál mostrar primero: el último mes COMPLETO. Si la última venta es del 5 de octubre,
// se muestra septiembre (octubre todavía va por la mitad y la comparación no sería justa).
// Lo usan P02 Inicio y P06 Tablero.
export function useMesesConVentas(token) {
  const [estado, setEstado] = useState({ cargando: true })

  useEffect(() => {
    let activo = true
    serieVentas(token, 'mes', { desde: '2000-01-01' })
      .then((r) => {
        if (!activo) return
        if (r.sin_datos || !r.puntos.length) {
          setEstado({ sinDatos: true })
          return
        }
        const meses = r.puntos.map((p) => ({ inicio: p.inicio, nombre: nombreMes(p.inicio, true) }))
        const ultimaVenta = r.periodo.hasta
        let porDefecto = meses.at(-1)
        if (meses.length > 1 && ultimaVenta < finDeMes(porDefecto.inicio)) porDefecto = meses.at(-2)
        // puntos: ventas de cada mes, para la mini tendencia de las tarjetas
        setEstado({ meses, ultimaVenta, porDefecto: porDefecto.inicio, puntos: r.puntos })
      })
      .catch((err) => activo && setEstado({ error: err.mensaje }))
    return () => {
      activo = false
    }
  }, [token])

  return estado
}
