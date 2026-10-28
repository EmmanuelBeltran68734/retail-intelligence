// Datos falsos de los indicadores (rutas 13, 16 y 17 del contrato).
// Copian los cálculos y las frases de backend/app/servicios/indicadores.py y backend/app/rutas/indicadores.py,
// para que P02 y P06 se vean igual con datos falsos y con el backend real.
//
// Ventas de la tienda falsa: un historial inventado (abril a septiembre de 2026, siempre el mismo)
// más lo que se haya guardado en P03–P05. Una tienda recién registrada empieza sin ventas.
import { esperar, fallo, leer, usuarioDelToken } from './datosFalsos.js'
import { diasEntre, sumarDias } from '../fechas.js'

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']
const TOP_PRODUCTOS = 10

// ---------- Historial inventado ----------

const PRODUCTOS = [
  ['ARZ-500', 'Arroz Diana 500 g', 'Granos', 3200, 14],
  ['HUE-30', 'Huevos x30', 'Lácteos', 18500, 5],
  ['ACE-1L', 'Aceite 1 L', 'Granos', 12900, 5],
  ['LEC-1L', 'Leche entera 1 L', 'Lácteos', 4500, 12],
  ['GAS-15', 'Gaseosa 1.5 L', 'Bebidas', 4800, 10],
  ['PAN-TAJ', 'Pan tajado', 'Panadería', 6800, 9],
  ['CAF-250', 'Café 250 g', 'Granos', 9800, 4],
  ['PNL-500', 'Panela', 'Granos', 3000, 6],
  ['AGU-600', 'Agua 600 ml', 'Bebidas', 2000, 8],
  ['PAP-150', 'Papas fritas 150 g', 'Snacks', 3500, 7],
  ['GAL-200', 'Galletas Festival 200 g', 'Snacks', 2500, 6],
  ['YOG-1L', 'Yogur 1 L', 'Lácteos', 8500, 3],
  ['FRI-500', 'Fríjol 500 g', 'Granos', 5600, 3],
  ['ATU-170', 'Atún 170 g', 'Enlatados', 6200, 3],
  ['JAB-BA', 'Jabón de baño', 'Aseo', 3900, 3],
  ['DET-1K', 'Detergente 1 kg', 'Aseo', 11500, 2],
]
const PESO_DIA = [0.8, 0.9, 0.95, 1, 1.15, 1.6, 1.3] // lunes a domingo

// Números al azar, pero siempre los mismos (semilla fija)
function azar(semilla) {
  let a = semilla
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

let historial = null
function historialInventado() {
  if (historial) return historial
  const r = azar(2026)
  const totalPeso = PRODUCTOS.reduce((s, p) => s + p[4], 0)
  const elegir = () => {
    let x = r() * totalPeso
    for (const p of PRODUCTOS) if ((x -= p[4]) < 0) return p
    return PRODUCTOS[0]
  }
  const filas = []
  let ticket = 0
  for (let fecha = '2026-04-01'; fecha <= '2026-09-30'; fecha = sumarDias(fecha, 1)) {
    const dia = (new Date(`${fecha}T00:00:00Z`).getUTCDay() + 6) % 7
    const mes = Number(fecha.slice(5, 7))
    const cuantos = Math.round((26 + r() * 10) * PESO_DIA[dia] * (1 + (mes - 4) * 0.03))
    for (let t = 0; t < cuantos; t++) {
      ticket++
      const id = `D-${ticket}`
      const cliente = r() < 0.6 ? `C-${String(1 + Math.floor(r() * 120)).padStart(3, '0')}` : null
      const items = 1 + Math.floor(r() * r() * 4)
      for (let i = 0; i < items; i++) {
        const [codigo, nombre, categoria, precio] = elegir()
        const cantidad = 1 + Math.floor(r() * r() * 3)
        filas.push([fecha, id, codigo, nombre, categoria, cantidad * precio, cliente])
      }
    }
  }
  historial = filas
  return filas
}

// Todas las ventas de la tienda falsa, con la forma del DataFrame del backend
function ventasDeLaTienda(db) {
  const filas = [...(db.ventasDemo === false ? [] : historialInventado()), ...(db.ventas || [])]
  const categorias = [...new Set(filas.map((f) => f[4]))].sort((a, b) => a.localeCompare(b, 'es'))
  const productos = [...new Set(filas.map((f) => f[2]))].sort()
  const idCategoria = new Map(categorias.map((c, i) => [c, i + 1]))
  const idProducto = new Map(productos.map((p, i) => [p, i + 1]))
  return filas.map(([fecha, id_venta, codigo, producto, categoria, importe, cliente]) => ({
    fecha,
    id_venta,
    id_producto: idProducto.get(codigo),
    codigo,
    producto,
    id_categoria: idCategoria.get(categoria),
    categoria,
    cliente,
    importe,
  }))
}

// ---------- Formato de las frases (igual que en Python) ----------

const entero = (n) => Math.round(n).toLocaleString('es-CO')
function decimal(n) {
  const texto = (Math.round(n * 10) / 10).toFixed(1).replace('.', ',')
  return texto.endsWith(',0') ? texto.slice(0, -2) : texto
}
function dinero(n) {
  if (Math.abs(n) >= 1_000_000) {
    const millones = Math.round(n / 100_000) / 10
    return `$${decimal(millones)} ${millones === 1 ? 'millón' : 'millones'}`
  }
  return `$${entero(n)}`
}
const esMesCompleto = (desde, hasta) =>
  desde.slice(8) === '01' && desde.slice(0, 7) === hasta.slice(0, 7) && sumarDias(hasta, 1).slice(8) === '01'
function nombrePeriodo(desde, hasta) {
  if (esMesCompleto(desde, hasta)) return MESES[Number(desde.slice(5, 7)) - 1]
  const dias = diasEntre(desde, hasta)
  return dias !== 1 ? `los ${dias} días anteriores` : 'el día anterior'
}
const fechaCorta = (f) => `${Number(f.slice(8))} ${MESES_CORTOS[Number(f.slice(5, 7)) - 1]}`

// ---------- Cálculos (igual que en Python) ----------

function totales(filas) {
  return [filas.reduce((s, f) => s + f.importe, 0), new Set(filas.map((f) => f.id_venta)).size]
}

function agrupar(filas, clave) {
  const g = new Map()
  for (const f of filas) {
    const k = clave(f)
    const x = g.get(k) || { ventas: 0, tickets: new Set(), fila: f }
    x.ventas += f.importe
    x.tickets.add(f.id_venta)
    g.set(k, x)
  }
  return g
}
const redondear = (n) => Math.round(n * 100) / 100

function resumen(filas, anteriores, desde, hasta, desdeAnt, hastaAnt) {
  const [ventas, transacciones] = totales(filas)
  const [ventasAnt] = totales(anteriores)
  const mes = esMesCompleto(desde, hasta)
  const cuando = mes ? `En ${MESES[Number(desde.slice(5, 7)) - 1]}` : 'En este período'
  const ticket = transacciones ? ventas / transacciones : 0

  let crecimiento = null
  let fraseCrec = 'Todavía no hay ventas del período anterior para comparar.'
  if (ventasAnt > 0) {
    crecimiento = Math.round(((ventas - ventasAnt) / ventasAnt) * 1000) / 10
    const referencia = mes ? `en ${nombrePeriodo(desdeAnt, hastaAnt)}` : nombrePeriodo(desdeAnt, hastaAnt)
    if (crecimiento > 0) fraseCrec = `Vendiste ${decimal(crecimiento)} % más que ${referencia}.`
    else if (crecimiento < 0) fraseCrec = `Vendiste ${decimal(-crecimiento)} % menos que ${referencia}.`
    else fraseCrec = `Vendiste lo mismo que ${referencia}.`
  }

  const porProducto = [...agrupar(filas, (f) => f.id_producto).values()].map((x) => x.ventas).sort((a, b) => b - a)
  const top = Math.min(TOP_PRODUCTOS, porProducto.length)
  const concentracion = ventas ? Math.round((porProducto.slice(0, top).reduce((s, v) => s + v, 0) / ventas) * 1000) / 10 : 0
  let fraseConc = `Tus ${top} productos más vendidos explican el ${decimal(concentracion)} % de tus ventas.`
  if (top === 0) fraseConc = 'Todavía no hay productos vendidos en este período.'
  else if (top === 1) fraseConc = 'Un solo producto explica todas tus ventas del período.'

  return {
    periodo: { desde, hasta },
    periodo_anterior: { desde: desdeAnt, hasta: hastaAnt },
    ventas_totales: { valor: redondear(ventas), frase: `${cuando} vendiste ${dinero(ventas)}.` },
    transacciones: { valor: transacciones, frase: transacciones === 1 ? 'Hiciste 1 venta.' : `Hiciste ${entero(transacciones)} ventas.` },
    ticket_promedio: { valor: Math.round(ticket), frase: `En promedio, cada cliente gastó ${dinero(ticket)}.` },
    crecimiento: { valor: crecimiento, frase: fraseCrec },
    concentracion: { valor: concentracion, top_productos: top, frase: fraseConc },
  }
}

function serie(filas, como, desde, hasta, limite) {
  if (!filas.length) return []
  const punto = (x) => ({ ventas: redondear(x?.ventas || 0), transacciones: x?.tickets.size || 0 })

  if (como === 'dia') {
    const g = agrupar(filas, (f) => f.fecha)
    const puntos = []
    for (let d = desde; d <= hasta; d = sumarDias(d, 1)) puntos.push({ etiqueta: fechaCorta(d), inicio: d, ...punto(g.get(d)) })
    return puntos
  }
  if (como === 'semana') {
    const g = agrupar(filas, (f) => Math.floor((diasEntre(desde, f.fecha) - 1) / 7))
    const puntos = []
    for (let b = 0; b <= Math.floor((diasEntre(desde, hasta) - 1) / 7); b++) {
      const inicio = sumarDias(desde, 7 * b)
      const fin = sumarDias(inicio, 6) < hasta ? sumarDias(inicio, 6) : hasta
      const etiqueta =
        inicio.slice(5, 7) === fin.slice(5, 7)
          ? `${Number(inicio.slice(8))}–${Number(fin.slice(8))} ${MESES_CORTOS[Number(fin.slice(5, 7)) - 1]}`
          : `${fechaCorta(inicio)}–${fechaCorta(fin)}`
      puntos.push({ etiqueta, inicio, ...punto(g.get(b)) })
    }
    return puntos
  }
  if (como === 'mes') {
    const g = agrupar(filas, (f) => `${f.fecha.slice(0, 7)}-01`)
    return [...g.keys()].sort().map((m) => ({
      etiqueta: `${MESES_CORTOS[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`,
      inicio: m,
      ...punto(g.get(m)),
    }))
  }
  if (como === 'dia_semana') {
    const g = agrupar(filas, (f) => (new Date(`${f.fecha}T00:00:00Z`).getUTCDay() + 6) % 7)
    return DIAS.map((etiqueta, d) => ({ etiqueta, orden: d + 1, ...punto(g.get(d)) }))
  }
  const [id, nombre] = { categoria: ['id_categoria', 'categoria'], producto: ['id_producto', 'producto'], cliente: ['cliente', 'cliente'] }[como]
  const conDato = filas.filter((f) => f[id] != null)
  let lista = [...agrupar(conDato, (f) => f[id]).values()]
    .map((x) => ({ etiqueta: x.fila[nombre], id: como === 'cliente' ? Number(String(x.fila.cliente).replace(/\D/g, '')) : x.fila[id], ...punto(x) }))
    .sort((a, b) => b.ventas - a.ventas)
  if (como !== 'categoria') lista = lista.slice(0, limite)
  return lista
}

// ---------- Ayudas de las rutas ----------

function filtrar(filas, desde, hasta, { categoria_id, cliente_id } = {}) {
  return filas.filter(
    (f) =>
      f.fecha >= desde &&
      f.fecha <= hasta &&
      (categoria_id == null || f.id_categoria === Number(categoria_id)) &&
      (cliente_id == null || Number(String(f.cliente).replace(/\D/g, '')) === Number(cliente_id)),
  )
}

// Si no se envían fechas: los últimos 30 días con ventas. null si la tienda no tiene ventas.
function periodo(filas, desde, hasta) {
  if (desde && hasta && desde > hasta) throw fallo(400, 'periodo_invalido', 'La fecha «desde» no puede ser posterior a «hasta».')
  if (!hasta) {
    if (!filas.length) return null
    const ultima = filas.reduce((m, f) => (f.fecha > m ? f.fecha : m), filas[0].fecha)
    hasta = desde && desde > ultima ? desde : ultima
  }
  if (!desde) desde = sumarDias(hasta, -29)
  return [desde, hasta]
}

function controlClientes(usuario, filtros, como) {
  if ((filtros.cliente_id != null || como === 'cliente') && usuario.rol !== 'propietario') {
    throw fallo(403, 'sin_permiso', 'Solo el propietario del comercio puede ver la información de clientes.')
  }
}

// ---------- Rutas ----------

// 13. GET /catalogo/categorias
export async function categorias(token) {
  await esperar()
  const db = leer()
  usuarioDelToken(db, token)
  const cuenta = new Map()
  for (const f of ventasDeLaTienda(db)) {
    const c = cuenta.get(f.id_categoria) || { id: f.id_categoria, nombre: f.categoria, productos: new Set() }
    c.productos.add(f.id_producto)
    cuenta.set(f.id_categoria, c)
  }
  return [...cuenta.values()].map((c) => ({ ...c, productos: c.productos.size })).sort((a, b) => a.id - b.id)
}

// 16. GET /indicadores/resumen
export async function resumenFalso(token, filtros = {}) {
  await esperar()
  const db = leer()
  const usuario = usuarioDelToken(db, token)
  controlClientes(usuario, filtros)
  const filas = ventasDeLaTienda(db)
  const p = periodo(filas, filtros.desde, filtros.hasta)
  if (!p) return { sin_datos: true }
  const [desde, hasta] = p
  let desdeAnt
  const hastaAnt = sumarDias(desde, -1)
  if (esMesCompleto(desde, hasta)) desdeAnt = `${hastaAnt.slice(0, 7)}-01`
  else desdeAnt = sumarDias(hastaAnt, -(diasEntre(desde, hasta) - 1))
  return {
    sin_datos: false,
    ...resumen(filtrar(filas, desde, hasta, filtros), filtrar(filas, desdeAnt, hastaAnt, filtros), desde, hasta, desdeAnt, hastaAnt),
  }
}

// 17. GET /indicadores/ventas
export async function ventasFalsas(token, como = 'semana', filtros = {}) {
  await esperar()
  const db = leer()
  const usuario = usuarioDelToken(db, token)
  controlClientes(usuario, filtros, como)
  const filas = ventasDeLaTienda(db)
  const p = periodo(filas, filtros.desde, filtros.hasta)
  if (!p) return { sin_datos: true, agrupar: como, puntos: [] }
  const [desde, hasta] = p
  return {
    sin_datos: false,
    agrupar: como,
    periodo: { desde, hasta },
    puntos: serie(filtrar(filas, desde, hasta, filtros), como, desde, hasta, filtros.limite || 10),
  }
}

// 18. GET /indicadores/abc (HU-08). Misma regla que indicadores.abc() en Python:
// de mayor a menor venta; A si lo acumulado ANTES del producto no llega al 80 %, B si no llega al 95 %, C el resto.
const CORTES = { A: 80, B: 95 }
const CONSEJOS = {
  A: 'Nunca dejes que se agoten: son los que sostienen tu negocio.',
  B: 'Revísalos cada semana.',
  C: 'Piensa si vale la pena seguir pidiéndolos.',
}

export async function abcFalso(token, filtros = {}) {
  await esperar()
  const db = leer()
  usuarioDelToken(db, token)
  const filas = ventasDeLaTienda(db)
  const p = periodo(filas, filtros.desde, filtros.hasta)
  if (!p) return { sin_datos: true }
  const [desde, hasta] = p
  const lista = [...agrupar(filtrar(filas, desde, hasta, filtros), (f) => f.id_producto).values()].sort(
    (a, b) => b.ventas - a.ventas,
  )
  const total = lista.reduce((s, x) => s + x.ventas, 0)
  let antes = 0
  const productos = lista.map(({ ventas, fila }) => {
    const parte = total ? (ventas / total) * 100 : 0
    const grupo = antes < CORTES.A ? 'A' : antes < CORTES.B ? 'B' : 'C'
    antes += parte
    return {
      id: fila.id_producto,
      codigo: fila.codigo,
      nombre: fila.producto,
      categoria: fila.categoria,
      ventas: redondear(ventas),
      porcentaje: redondear(parte),
      porcentaje_acumulado: redondear(antes),
      grupo,
    }
  })
  const resumenGrupos = ['A', 'B', 'C'].map((grupo) => {
    const delGrupo = productos.filter((x) => x.grupo === grupo)
    const ventas = delGrupo.reduce((s, x) => s + x.ventas, 0)
    return {
      grupo,
      productos: delGrupo.length,
      porcentaje_ventas: total ? Math.round((ventas / total) * 1000) / 10 : 0,
      consejo: CONSEJOS[grupo],
    }
  })
  return { sin_datos: false, periodo: { desde, hasta }, criterio: 'ventas', cortes: CORTES, resumen: resumenGrupos, productos }
}
