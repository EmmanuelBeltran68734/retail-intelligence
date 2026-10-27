// Cuentas con fechas "AAAA-MM-DD" (como las manda el backend), siempre en UTC
// para que la zona horaria de Colombia no corra un día.

const aFecha = (texto) => new Date(`${String(texto).slice(0, 10)}T00:00:00Z`)
const aTexto = (fecha) => fecha.toISOString().slice(0, 10)

export function sumarDias(texto, dias) {
  const f = aFecha(texto)
  f.setUTCDate(f.getUTCDate() + dias)
  return aTexto(f)
}

// "2026-09-01" -> "2026-09-30"
export function finDeMes(texto) {
  const f = aFecha(texto)
  return aTexto(new Date(Date.UTC(f.getUTCFullYear(), f.getUTCMonth() + 1, 0)))
}

// "2026-09-14" -> "2026-09-01"
export function inicioDeMes(texto) {
  return `${String(texto).slice(0, 7)}-01`
}

// "2026-09-01", -2 -> "2026-07-01"
export function sumarMeses(texto, meses) {
  const f = aFecha(texto)
  return aTexto(new Date(Date.UTC(f.getUTCFullYear(), f.getUTCMonth() + meses, 1)))
}

export function diasEntre(desde, hasta) {
  return Math.round((aFecha(hasta) - aFecha(desde)) / 86400000) + 1
}

export const menor = (a, b) => (a < b ? a : b)
export const mayor = (a, b) => (a > b ? a : b)

// El período con el que se compara (igual que el backend en rutas/indicadores.py):
// si es un mes completo, el mes anterior; si no, el mismo número de días justo antes.
export function periodoAnterior(desde, hasta) {
  const hastaAnt = sumarDias(desde, -1)
  const mesCompleto = desde.slice(8) === '01' && desde.slice(0, 7) === hasta.slice(0, 7) && hasta === finDeMes(hasta)
  if (mesCompleto) return { desde: inicioDeMes(hastaAnt), hasta: hastaAnt }
  return { desde: sumarDias(hastaAnt, -(diasEntre(desde, hasta) - 1)), hasta: hastaAnt }
}
