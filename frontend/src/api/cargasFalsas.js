// Datos falsos de la carga de ventas (rutas 7 a 12 del contrato).
// Imitan al backend: leen el CSV en el navegador y lo revisan con las MISMAS reglas y los MISMOS
// mensajes de Bianca (backend/app/servicios/validacion.py), para que P04 se vea igual en los dos modos.
// En modo de ejemplo solo se leen archivos .csv (leer Excel necesitaría otra librería).
import { esperar, fallo, guardar, leer, usuarioDelToken } from './datosFalsos.js'
import { NOMBRES, OBLIGATORIAS, TAMANO_MAXIMO, csvPlantilla } from '../plantilla.js'

const MEDIOS_PAGO = ['efectivo', 'tarjeta', 'transferencia', 'credito']

// ---------- Leer el CSV ----------

// «Código producto» -> «codigo_producto»: sin tildes, en minúscula y con guion bajo (igual que el backend)
function normalizarEncabezado(texto) {
  return String(texto)
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .join('_')
}

// Separa un CSV en filas y celdas. Acepta coma o punto y coma y celdas entre comillas.
function partirCsv(texto) {
  texto = texto.replace(/^\uFEFF/, '')
  const primera = texto.split(/\r?\n/, 1)[0]
  const sep = (primera.match(/;/g) || []).length > (primera.match(/,/g) || []).length ? ';' : ','
  const filas = []
  let fila = []
  let celda = ''
  let entreComillas = false
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]
    if (entreComillas) {
      if (c === '"' && texto[i + 1] === '"') {
        celda += '"'
        i++
      } else if (c === '"') entreComillas = false
      else celda += c
    } else if (c === '"') entreComillas = true
    else if (c === sep) {
      fila.push(celda)
      celda = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++
      fila.push(celda)
      filas.push(fila)
      fila = []
      celda = ''
    } else celda += c
  }
  if (celda !== '' || fila.length) {
    fila.push(celda)
    filas.push(fila)
  }
  return filas
}

// ---------- Reglas de calidad (copiadas de validacion.py) ----------

function fechaValida(a, m, d) {
  const f = new Date(Date.UTC(a, m - 1, d))
  return f.getUTCFullYear() === a && f.getUTCMonth() === m - 1 && f.getUTCDate() === d
}

// Formatos aceptados: AAAA-MM-DD, DD/MM/AAAA, AAAA-MM-DD HH:MM:SS y DD-MM-AAAA
function leerFecha(texto) {
  const t = texto.trim()
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?: \d{1,2}:\d{1,2}:\d{1,2})?$/)
  if (m) return fechaValida(+m[1], +m[2], +m[3]) ? `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` : null
  m = t.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (m) return fechaValida(+m[3], +m[2], +m[1]) ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null
  return null
}

function leerNumero(texto) {
  let limpio = texto.trim().replaceAll('$', '').replaceAll(' ', '')
  if (/^\d{1,3}(\.\d{3})+$/.test(limpio)) limpio = limpio.replaceAll('.', '')
  else if (limpio.includes(',') && !limpio.includes('.')) limpio = limpio.replace(',', '.')
  if (!/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(limpio)) return null
  const n = Number(limpio)
  return Number.isFinite(n) ? n : null
}

function leerMedioPago(texto) {
  let medio = texto.trim().toLowerCase().replaceAll('é', 'e').replaceAll('í', 'i')
  if (medio === 'fiado') medio = 'credito'
  return MEDIOS_PAGO.includes(medio) ? medio : null
}

function revisar(registros) {
  const errores = []
  const validas = []
  const vistas = new Map()
  const error = (fila, campo, tipo, valor, mensaje, sugerencia) =>
    errores.push({ fila, columna: campo, tipo, valor, mensaje, sugerencia })

  registros.forEach((registro, posicion) => {
    const fila = posicion + 2
    const v = Object.fromEntries(Object.entries(registro).map(([k, x]) => [k, String(x ?? '').trim()]))
    if (!Object.values(v).some(Boolean)) return // fila vacía
    const antes = errores.length

    for (const campo of OBLIGATORIAS) {
      if (!v[campo]) error(fila, campo, 'faltante', '', `Fila ${fila}: falta el dato de «${campo}».`, 'Completa la celda o elimina la fila vacía.')
    }

    let fecha = null
    if (v.fecha) {
      fecha = leerFecha(v.fecha)
      if (!fecha) {
        if (/^\s*\d{1,4}[/-]\d{1,2}[/-]\d{1,4}/.test(v.fecha)) {
          error(fila, 'fecha', 'fecha_inexistente', v.fecha, `Fila ${fila}: la fecha ${v.fecha} no existe.`, 'Revisa la fecha y utiliza el formato AAAA-MM-DD.')
        } else {
          error(fila, 'fecha', 'fecha_invalida', v.fecha, `Fila ${fila}: «${v.fecha}» no es una fecha válida.`, 'Escribe la fecha en formato AAAA-MM-DD.')
        }
      }
    }

    const numeros = {}
    for (const [campo, permiteCero] of [['cantidad', false], ['precio_unitario', false], ['descuento', true]]) {
      const texto = v[campo] || ''
      if (!texto) continue
      const n = leerNumero(texto)
      if (n === null) {
        error(fila, campo, 'no_numerico', texto, `Fila ${fila}: «${texto}» no es un número válido en «${campo}».`, 'Ingresa un valor numérico válido.')
        continue
      }
      if (permiteCero ? n < 0 : n <= 0) {
        error(
          fila,
          campo,
          'fuera_de_rango',
          texto,
          `Fila ${fila}: «${campo}» debe ser ${permiteCero ? 'mayor o igual a cero' : 'mayor que cero'}.`,
          campo === 'cantidad'
            ? 'Revisa si se trata de una devolución. Por ahora, no procesamos devoluciones.'
            : 'Verifica el valor registrado en la venta.',
        )
      } else numeros[campo] = n
    }

    if (v.medio_pago) {
      if (!leerMedioPago(v.medio_pago)) {
        error(fila, 'medio_pago', 'valor_no_permitido', v.medio_pago, `Fila ${fila}: el medio de pago «${v.medio_pago}» no es válido.`, 'Utiliza efectivo, tarjeta, transferencia o crédito.')
      }
    }

    const clave = NOMBRES.map((c) => v[c] || '').join('\u0001')
    if (vistas.has(clave)) {
      error(fila, 'fila', 'duplicada', '', `Fila ${fila}: este registro es igual al de la fila ${vistas.get(clave)}.`, 'Verifica si la venta está repetida.')
    } else vistas.set(clave, fila)

    if (errores.length === antes) {
      validas.push({
        fecha,
        id_ticket: v.id_ticket,
        codigo_producto: v.codigo_producto,
        nombre_producto: v.nombre_producto,
        categoria: v.categoria,
        cantidad: numeros.cantidad,
        precio_unitario: numeros.precio_unitario,
        descuento: numeros.descuento || 0,
        id_cliente: v.id_cliente || null,
      })
    }
  })
  return { validas, errores }
}

// ---------- Ayudas ----------

function base(db) {
  db.cargas ||= []
  db.siguienteCarga ||= 1
  db.catalogo ||= { productos: {}, categorias: [], clientes: [], tickets: [] }
  return db
}

function sinErrores(c) {
  // eslint-disable-next-line no-unused-vars
  const { errores, pendientes, ...resumen } = c
  return resumen
}

function detalle(c) {
  // eslint-disable-next-line no-unused-vars
  const { pendientes, ...resto } = c
  return { ...resto, errores: c.errores.map(({ fila, columna, valor, mensaje, sugerencia }) => ({ fila, columna, valor, mensaje, sugerencia })) }
}

function buscar(db, id) {
  const carga = db.cargas.find((c) => c.id === id)
  if (!carga) throw fallo(404, 'no_encontrada', 'No encontramos esa carga en tu comercio.')
  return carga
}

// ---------- Rutas (mismo número que en el contrato) ----------

// 7. GET /cargas/plantilla (solo CSV en modo de ejemplo)
export async function plantilla(formato) {
  await esperar()
  if (formato === 'xlsx') {
    throw fallo(400, 'solo_csv', 'En modo de ejemplo solo se descarga la plantilla en CSV. Con el servidor también sale en Excel.')
  }
  return new Blob([csvPlantilla()], { type: 'text/csv;charset=utf-8' })
}

// 8. POST /cargas
export async function subir(token, archivo) {
  await esperar()
  const db = base(leer())
  usuarioDelToken(db, token)
  const nombre = archivo?.name || 'archivo'
  if (archivo.size > TAMANO_MAXIMO) {
    throw fallo(422, 'archivo_muy_grande', 'El archivo pesa más de 5 MB. Divide las ventas en varios archivos.')
  }
  if (!/\.(csv|xlsx)$/i.test(nombre)) {
    throw fallo(422, 'formato_no_soportado', 'Solo se pueden subir archivos .csv o .xlsx. Si es un .xls, guárdalo como .xlsx desde Excel.')
  }
  if (/\.xlsx$/i.test(nombre)) {
    throw fallo(422, 'archivo_ilegible', 'En modo de ejemplo solo se pueden leer archivos .csv. Con el servidor también sirve Excel.')
  }

  const filas = partirCsv(await archivo.text())
  if (!filas.length) throw fallo(422, 'archivo_ilegible', 'No pudimos leer el archivo. Revisa que esté basado en la plantilla.')
  const encabezados = filas[0].map(normalizarEncabezado)
  const registros = filas.slice(1).map((f) => Object.fromEntries(encabezados.map((h, i) => [h, f[i] ?? ''])))

  const carga = {
    id: `carga-${db.siguienteCarga++}`,
    nombre_archivo: nombre,
    estado: 'recibida',
    creada_en: new Date().toISOString(),
    filas_totales: registros.length,
    filas_validas: 0,
    filas_con_error: 0,
    columnas_ignoradas: [],
    periodo: { desde: null, hasta: null },
    errores: [],
  }

  const faltan = OBLIGATORIAS.filter((c) => !encabezados.includes(c))
  if (faltan.length) {
    carga.estado = 'rechazada'
    db.cargas.unshift(carga)
    guardar(db)
    const e = fallo(
      422,
      'columnas_faltantes',
      `Al archivo le faltan columnas obligatorias: ${faltan.join(', ')}. Descarga la plantilla y compáralas.`,
    )
    e.faltan = faltan
    throw e
  }

  const { validas, errores } = revisar(registros)
  const fechas = validas.map((v) => v.fecha).sort()
  carga.columnas_ignoradas = encabezados.filter((h) => h && !NOMBRES.includes(h))
  carga.filas_validas = validas.length
  carga.filas_con_error = new Set(errores.map((e) => e.fila)).size
  carga.filas_totales = carga.filas_validas + carga.filas_con_error
  carga.periodo = { desde: fechas[0] || null, hasta: fechas.at(-1) || null }
  carga.estado = errores.length ? 'con_errores' : 'recibida'
  carga.errores = errores
  carga.pendientes = validas
  db.cargas.unshift(carga)
  guardar(db)
  return detalle(carga)
}

// 9. GET /cargas
export async function listar(token) {
  await esperar()
  const db = base(leer())
  usuarioDelToken(db, token)
  return db.cargas.map(sinErrores)
}

// 10. GET /cargas/{id}
export async function ver(token, id) {
  await esperar()
  const db = base(leer())
  usuarioDelToken(db, token)
  return detalle(buscar(db, id))
}

// 11. POST /cargas/{id}/confirmar
export async function confirmar(token, id) {
  await esperar()
  const db = base(leer())
  usuarioDelToken(db, token)
  const carga = buscar(db, id)
  if (carga.estado === 'validada') throw fallo(409, 'carga_ya_validada', 'Esta carga ya se guardó.')
  if (carga.estado === 'rechazada') throw fallo(409, 'carga_rechazada', 'Esta carga fue descartada. Sube el archivo otra vez.')
  const filas = carga.pendientes || []
  if (!filas.length) {
    throw fallo(400, 'sin_filas_validas', 'El archivo no tiene filas correctas para guardar. Corrige los errores y súbelo de nuevo.')
  }

  const cat = db.catalogo
  const tickets = new Set(cat.tickets)
  const nuevosTickets = new Set()
  const productos = []
  const categorias = []
  let clientes = 0
  let guardadas = 0
  let descartadas = carga.filas_con_error
  let total = 0
  const fechas = []
  for (const f of filas) {
    const clave = `${f.id_ticket}|${f.fecha}`
    if (tickets.has(clave)) {
      descartadas++ // ese ticket ya se había cargado antes
      continue
    }
    nuevosTickets.add(clave)
    if (!cat.categorias.some((c) => c.toLowerCase() === f.categoria.toLowerCase())) {
      cat.categorias.push(f.categoria)
      categorias.push(f.categoria)
    }
    if (!cat.productos[f.codigo_producto]) {
      cat.productos[f.codigo_producto] = { nombre: f.nombre_producto, categoria: f.categoria }
      productos.push({ codigo: f.codigo_producto, nombre: f.nombre_producto, categoria: f.categoria })
    }
    if (f.id_cliente && !cat.clientes.includes(f.id_cliente)) {
      cat.clientes.push(f.id_cliente)
      clientes++
    }
    total += f.cantidad * f.precio_unitario - f.descuento
    fechas.push(f.fecha)
    guardadas++
  }
  cat.tickets.push(...nuevosTickets)
  fechas.sort()

  carga.estado = 'validada'
  delete carga.pendientes
  guardar(db)
  return {
    id: carga.id,
    estado: 'validada',
    ventas_guardadas: guardadas,
    filas_descartadas: descartadas,
    periodo: { desde: fechas[0] || null, hasta: fechas.at(-1) || null },
    total_vendido: Math.round(total * 100) / 100,
    catalogo_nuevo: { productos, categorias, clientes },
  }
}

// 12. DELETE /cargas/{id}
export async function descartar(token, id) {
  await esperar()
  const db = base(leer())
  usuarioDelToken(db, token)
  const carga = buscar(db, id)
  if (carga.estado === 'validada') throw fallo(409, 'carga_ya_validada', 'Esta carga ya se guardó y no se puede descartar.')
  carga.estado = 'rechazada'
  delete carga.pendientes
  guardar(db)
  return null
}
