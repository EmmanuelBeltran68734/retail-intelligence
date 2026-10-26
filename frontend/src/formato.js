// Cómo se muestran números, pesos y fechas en todas las pantallas (español de Colombia).

// 18452300 -> "$18.452.300"
export function pesos(valor) {
  return '$' + Math.round(Number(valor) || 0).toLocaleString('es-CO')
}

// 1238 -> "1.238"
export function numero(valor) {
  return (Number(valor) || 0).toLocaleString('es-CO')
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

// "2026-09-14" -> { a: 2026, m: 9, d: 14 } (sin pasar por Date, para que la zona horaria no cambie el día)
function partes(texto) {
  const [a, m, d] = String(texto || '').slice(0, 10).split('-').map(Number)
  return a && m && d ? { a, m, d } : null
}

// "2026-09-14" -> "14 de septiembre de 2026"
export function fechaLarga(texto) {
  const p = partes(texto)
  return p ? `${p.d} de ${MESES[p.m - 1]} de ${p.a}` : ''
}

// { desde: "2026-04-01", hasta: "2026-09-30" } -> "del 1 de abril al 30 de septiembre de 2026"
export function periodoTexto(periodo) {
  const desde = partes(periodo?.desde)
  const hasta = partes(periodo?.hasta)
  if (!desde || !hasta) return ''
  if (periodo.desde === periodo.hasta) return `el ${fechaLarga(periodo.desde)}`
  const inicio = desde.a === hasta.a ? `${desde.d} de ${MESES[desde.m - 1]}` : fechaLarga(periodo.desde)
  return `del ${inicio} al ${fechaLarga(periodo.hasta)}`
}

// "2026-10-26T15:42:10-05:00" -> "26 oct. 2026"
export function fechaCorta(texto) {
  const fecha = new Date(texto)
  if (Number.isNaN(fecha.getTime())) return ''
  return fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
}

const MES_CORTO = ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sep.', 'oct.', 'nov.', 'dic.']

// { desde: "2026-04-01", hasta: "2026-09-30" } -> "1 abr. – 30 sep. 2026" (para tablas)
export function periodoCorto(periodo) {
  const desde = partes(periodo?.desde)
  const hasta = partes(periodo?.hasta)
  if (!desde || !hasta) return ''
  const fin = `${hasta.d} ${MES_CORTO[hasta.m - 1]} ${hasta.a}`
  if (periodo.desde === periodo.hasta) return fin
  return `${desde.d} ${MES_CORTO[desde.m - 1]}${desde.a === hasta.a ? '' : ' ' + desde.a} – ${fin}`
}

// 1 -> "1 fila", 3 -> "3 filas"
export function plural(cantidad, singular, pluralTexto = singular + 's') {
  return `${numero(cantidad)} ${cantidad === 1 ? singular : pluralTexto}`
}
