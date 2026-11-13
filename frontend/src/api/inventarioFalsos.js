// Datos de ejemplo de O2 · Inventario y agotamientos (rutas 20 a 23 del contrato 0.7).
// La regla de agotamientos es la misma de backend/app/servicios/agotamientos.py, con los mismos mensajes.
// Nunca se dice «se agotó» si no hay un conteo de existencias en cero.

import { esperar, fallo, guardar, leer, usuarioDelToken } from './datosFalsos.js'
import { normalizarEncabezado, partirCsv } from './cargasFalsas.js'
import { ventasDeLaTienda } from './indicadoresFalsos.js'
import { TAMANO_MAXIMO, aCsv } from '../plantilla.js'
import { sumarDias } from '../fechas.js'

const COLUMNAS = ['fecha', 'codigo_producto', 'existencias']
const EJEMPLO = [
  ['2026-09-30', 'ARZ-500', '12'],
  ['2026-09-30', 'LEC-1L', '0'],
]

// Mismos parámetros que agotamientos.py
const VENTANA_DIAS = 90
const DIAS_MINIMOS = 3
const FACTOR = 3
const MINIMO_DIAS_CON_VENTA = 3
const REGLA = {
  ventana_dias: VENTANA_DIAS,
  dias_minimos: DIAS_MINIMOS,
  factor: FACTOR,
  minimo_dias_con_venta: MINIMO_DIAS_CON_VENTA,
  descripcion:
    `Solo cuentan los días en que el negocio vendió algo. Un producto se marca si lleva al menos ${DIAS_MINIMOS} de esos ` +
    `días sin venderse y al menos ${FACTOR} veces lo que normalmente tarda entre una venta y otra. ` +
    'Solo se afirma «se agotó» si un conteo de existencias dice 0.',
}
const ORDEN = { confirmado: 0, posible: 1, con_existencias: 2 }

// Conteos de ejemplo de la tienda de demostración: el yogur en 0 (confirmado) y el detergente con unidades.
// El atún no tiene conteo: queda como «posible». El 30 de septiembre, al cierre, se contaron también algunos
// de los más vendidos: la leche se acabó ese día (pídela) y del arroz y los huevos todavía hay.
const CONTEOS_DEMO = [
  { fecha: '2026-09-30', codigo: 'ARZ-500', existencias: 12 },
  { fecha: '2026-09-30', codigo: 'HUE-30', existencias: 5 },
  { fecha: '2026-09-30', codigo: 'LEC-1L', existencias: 0 },
  { fecha: '2026-09-28', codigo: 'YOG-1L', existencias: 0 },
  { fecha: '2026-09-28', codigo: 'DET-1K', existencias: 7 },
]

function conteosDe(db) {
  if (!db.conteos) db.conteos = db.ventasDemo === false ? [] : CONTEOS_DEMO.map((c) => ({ ...c }))
  return db.conteos
}

// "2026-09-28" -> "28/09/2026", como en Python
const conBarras = (f) => `${f.slice(8, 10)}/${f.slice(5, 7)}/${f.slice(0, 4)}`

function catalogo(db) {
  const productos = new Map()
  for (const f of ventasDeLaTienda(db)) {
    if (!productos.has(f.codigo)) productos.set(f.codigo, { id: f.id_producto, codigo: f.codigo, nombre: f.producto, categoria: f.categoria })
  }
  return productos
}

// 20. GET /inventario/plantilla
export async function plantillaInventario() {
  await esperar()
  return new Blob([aCsv(COLUMNAS, EJEMPLO)], { type: 'text/csv;charset=utf-8' })
}

// 21. POST /inventario
export async function subirConteo(token, archivo) {
  await esperar()
  const db = leer()
  usuarioDelToken(db, token)
  const nombre = archivo?.name || 'archivo'
  if (archivo.size > TAMANO_MAXIMO) throw fallo(422, 'archivo_muy_grande', 'El archivo pesa más de 5 MB.')
  if (!/\.(csv|xlsx)$/i.test(nombre)) throw fallo(422, 'formato_no_soportado', 'Solo se pueden subir archivos .csv o .xlsx.')
  if (/\.xlsx$/i.test(nombre)) {
    throw fallo(422, 'archivo_ilegible', 'En modo de ejemplo solo se pueden leer archivos .csv. Con el servidor también sirve Excel.')
  }
  const filas = partirCsv(await archivo.text())
  if (!filas.length) throw fallo(422, 'archivo_ilegible', 'No pudimos leer el archivo. Revisa que esté basado en la plantilla.')
  const encabezados = filas[0].map(normalizarEncabezado)
  const faltan = COLUMNAS.filter((c) => !encabezados.includes(c))
  if (faltan.length) {
    const e = fallo(422, 'columnas_faltantes', `Al archivo le faltan columnas: ${faltan.join(', ')}. Descarga la plantilla de inventario.`)
    e.faltan = faltan
    throw e
  }

  const productos = catalogo(db)
  const conteos = conteosDe(db)
  const errores = []
  const validas = new Map()
  filas.slice(1).forEach((f, i) => {
    const n = i + 2 // la fila 1 es el encabezado
    const [fecha, codigo, texto] = COLUMNAS.map((c) => String(f[encabezados.indexOf(c)] ?? '').trim())
    if (!fecha && !codigo && !texto) return
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || Number.isNaN(new Date(`${fecha}T00:00:00Z`).getTime()) || new Date(`${fecha}T00:00:00Z`).toISOString().slice(0, 10) !== fecha) {
      errores.push({ fila: n, columna: 'fecha', valor: fecha, mensaje: `Fila ${n}: «${fecha}» no es una fecha válida.`, sugerencia: 'Escríbala como AAAA-MM-DD.' })
      return
    }
    if (!productos.has(codigo)) {
      errores.push({ fila: n, columna: 'codigo_producto', valor: codigo, mensaje: `Fila ${n}: el producto «${codigo}» no está en tu catálogo.`, sugerencia: 'Usa el mismo código con el que aparece en tus ventas.' })
      return
    }
    const existencias = Number(texto.replace(',', '.'))
    if (texto === '' || Number.isNaN(existencias) || existencias < 0) {
      errores.push({ fila: n, columna: 'existencias', valor: texto, mensaje: `Fila ${n}: «existencias» debe ser un número igual o mayor que cero.`, sugerencia: 'Escribe cuántas unidades contaste; si no hay, escribe 0.' })
      return
    }
    validas.set(`${codigo}|${fecha}`, { fecha, codigo, existencias }) // si se repite en el archivo, gana la última
  })

  let nuevos = 0
  let actualizados = 0
  for (const c of validas.values()) {
    const antes = conteos.find((x) => x.codigo === c.codigo && x.fecha === c.fecha)
    if (antes) {
      antes.existencias = c.existencias
      actualizados++
    } else {
      conteos.push(c)
      nuevos++
    }
  }
  guardar(db)
  return { nombre_archivo: nombre, conteos_guardados: nuevos, conteos_actualizados: actualizados, filas_con_error: errores.length, errores }
}

// 22. GET /inventario (contrato 0.8: también trae id_producto)
export async function listarConteos(token) {
  await esperar()
  const db = leer()
  usuarioDelToken(db, token)
  const productos = catalogo(db)
  return [...conteosDe(db)]
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || a.codigo.localeCompare(b.codigo))
    .map((c) => ({
      fecha: c.fecha,
      id_producto: productos.get(c.codigo)?.id ?? null,
      codigo: c.codigo,
      producto: productos.get(c.codigo)?.nombre || c.codigo,
      existencias: c.existencias,
    }))
}

// 23. GET /indicadores/agotamientos
export async function agotamientosFalsos(token, filtros = {}) {
  await esperar()
  const db = leer()
  usuarioDelToken(db, token)
  const ventas = ventasDeLaTienda(db)
  if (!ventas.length) return { sin_datos: true }
  const ultimaVenta = ventas.reduce((m, f) => (f.fecha > m ? f.fecha : m), ventas[0].fecha)
  const hasta = filtros.hasta && filtros.hasta < ultimaVenta ? filtros.hasta : ultimaVenta
  const desde = sumarDias(hasta, -(VENTANA_DIAS - 1))
  const enVentana = ventas.filter((f) => f.fecha >= desde && f.fecha <= hasta)
  const diasNegocio = [...new Set(enVentana.map((f) => f.fecha))].sort()
  const conteos = conteosDe(db)

  const porProducto = new Map()
  for (const f of enVentana) {
    const x = porProducto.get(f.codigo) || { fila: f, dias: new Set() }
    x.dias.add(f.fecha)
    porProducto.set(f.codigo, x)
  }

  const productos = []
  for (const [codigo, { fila, dias }] of porProducto) {
    const diasProducto = [...dias].sort()
    if (diasProducto.length < MINIMO_DIAS_CON_VENTA) continue
    const ultima = diasProducto.at(-1)
    const activos = diasNegocio.filter((d) => d >= diasProducto[0] && d <= ultima).length
    const cada = activos / diasProducto.length // se vende 1 de cada `cada` días de venta
    const racha = diasNegocio.filter((d) => d > ultima).length
    if (racha < Math.max(DIAS_MINIMOS, Math.ceil(FACTOR * cada))) continue

    const posteriores = conteos.filter((c) => c.codigo === codigo && c.fecha >= ultima).sort((a, b) => a.fecha.localeCompare(b.fecha))
    const evidencia = posteriores.length ? { fecha: posteriores.at(-1).fecha, existencias: posteriores.at(-1).existencias } : null
    const habitual = `normalmente se vende 1 de cada ${cada.toFixed(1).replace('.', ',').replace(/,0$/, '')} días`
    let tipo, confianza, mensaje
    if (evidencia && evidencia.existencias <= 0) {
      tipo = 'confirmado'
      confianza = 'alta'
      mensaje = `Se agotó: el conteo del ${conBarras(evidencia.fecha)} dice 0 unidades. No se vende desde el ${conBarras(ultima)}.`
    } else if (evidencia) {
      tipo = 'con_existencias'
      confianza = 'alta'
      mensaje = `Dejó de venderse, pero el conteo del ${conBarras(evidencia.fecha)} muestra ${evidencia.existencias} unidades: no fue un agotamiento. Revisa si está a la vista o si cambió la demanda.`
    } else {
      tipo = 'posible'
      confianza = 'baja'
      mensaje = `Posible agotamiento: lleva ${racha} días de venta sin venderse y ${habitual}. No tenemos un conteo de existencias que lo confirme.`
    }
    productos.push({
      producto: { id: fila.id_producto, codigo, nombre: fila.producto, categoria: fila.categoria },
      ultima_venta: ultima,
      dias_sin_venta: racha,
      se_vende_cada_dias: Math.round(cada * 10) / 10,
      tipo,
      confianza,
      evidencia,
      mensaje,
    })
  }
  productos.sort((a, b) => ORDEN[a.tipo] - ORDEN[b.tipo] || b.dias_sin_venta - a.dias_sin_venta)
  const resumen = { confirmado: 0, posible: 0, con_existencias: 0 }
  for (const p of productos) resumen[p.tipo]++
  return { sin_datos: false, periodo: { desde, hasta }, regla: REGLA, resumen, productos }
}
