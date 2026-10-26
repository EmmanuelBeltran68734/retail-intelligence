// La plantilla de ventas del Anexo B (tabla 5), igual a docs/api-contrato.md y a backend/app/servicios/plantilla.py.
// La usan P13 (guía), los datos falsos y el archivo de ejemplo.

export const COLUMNAS = [
  { nombre: 'fecha', obligatoria: true, ejemplo: '2026-09-14', tipo: 'Fecha AAAA-MM-DD', sirve: 'Tablero, tendencias y pronóstico' },
  { nombre: 'id_ticket', obligatoria: true, ejemplo: 'F-00231', tipo: 'Texto', sirve: 'Ticket promedio y productos que van juntos' },
  { nombre: 'codigo_producto', obligatoria: true, ejemplo: 'ARZ-500', tipo: 'Texto', sirve: 'Catálogo y productos clave' },
  { nombre: 'nombre_producto', obligatoria: true, ejemplo: 'Arroz Diana 500 g', tipo: 'Texto', sirve: 'Que todo se lea en palabras' },
  { nombre: 'categoria', obligatoria: true, ejemplo: 'Granos', tipo: 'Texto', sirve: 'Ventas por categoría' },
  { nombre: 'cantidad', obligatoria: true, ejemplo: '2', tipo: 'Número mayor que 0', sirve: 'Todo' },
  { nombre: 'precio_unitario', obligatoria: true, ejemplo: '3200', tipo: 'Pesos, mayor que 0', sirve: 'Todo' },
  { nombre: 'descuento', obligatoria: false, ejemplo: '0', tipo: 'Pesos, 0 o más', sirve: 'Promociones' },
  { nombre: 'id_cliente', obligatoria: false, ejemplo: 'C-014', tipo: 'Código, nunca nombre ni cédula', sirve: 'Grupos de clientes' },
  { nombre: 'medio_pago', obligatoria: false, ejemplo: 'efectivo', tipo: 'efectivo, tarjeta, transferencia o credito', sirve: 'Ventas por medio de pago' },
]

export const OBLIGATORIAS = COLUMNAS.filter((c) => c.obligatoria).map((c) => c.nombre)
export const NOMBRES = COLUMNAS.map((c) => c.nombre)
export const TAMANO_MAXIMO = 5 * 1024 * 1024 // 5 MB, igual que el backend

// Las tres filas de ejemplo que trae la plantilla descargable (las mismas del backend)
export const FILAS_PLANTILLA = [
  ['2026-09-14', 'F-00231', 'ARZ-500', 'Arroz Diana 500 g', 'Granos', 2, 3200, 0, 'C-014', 'efectivo'],
  ['2026-09-14', 'F-00231', 'LEC-1L', 'Leche entera 1 L', 'Lácteos', 1, 4500, 0, 'C-014', 'efectivo'],
  ['2026-09-14', 'F-00232', 'PAN-TAJ', 'Pan tajado', 'Panadería', 1, 6800, 500, '', 'transferencia'],
]

// Archivo de ejemplo para probar P04: 12 filas, 7 buenas y 5 con errores a propósito
// (fecha que no existe, cantidad vacía, cantidad negativa, medio de pago raro y una fila repetida),
// más una columna de sobra ("vendedor") que se ignora.
const FILAS_EJEMPLO = [
  ['2026-10-01', 'EJ-0001', 'ARZ-500', 'Arroz Diana 500 g', 'Granos', '2', '3200', '0', 'C-014', 'efectivo', 'Julián'],
  ['2026-10-01', 'EJ-0001', 'LEC-1L', 'Leche entera 1 L', 'Lácteos', '1', '4500', '0', 'C-014', 'efectivo', 'Julián'],
  ['2026-10-01', 'EJ-0002', 'PAN-TAJ', 'Pan tajado', 'Panadería', '1', '6800', '500', '', 'transferencia', 'Marta'],
  ['2026-10-02', 'EJ-0003', 'ACE-1L', 'Aceite 1 L', 'Granos', '1', '12900', '0', 'C-021', 'tarjeta', 'Marta'],
  ['2026-10-02', 'EJ-0003', 'HUE-30', 'Huevos x30', 'Lácteos', '1', '18500', '0', 'C-021', 'tarjeta', 'Marta'],
  ['31/02/2026', 'EJ-0004', 'GAS-15', 'Gaseosa 1.5 L', 'Bebidas', '3', '4800', '0', '', 'efectivo', 'Julián'],
  ['2026-10-03', 'EJ-0005', 'CAF-250', 'Café 250 g', 'Granos', '', '9800', '0', 'C-008', 'fiado', 'Marta'],
  ['2026-10-03', 'EJ-0006', 'GAL-200', 'Galletas Festival 200 g', 'Snacks', '-2', '2500', '0', '', 'efectivo', 'Julián'],
  ['2026-10-04', 'EJ-0007', 'PAN-TAJ', 'Pan tajado', 'Panadería', '2', '6800', '0', 'C-047', 'cheque', 'Marta'],
  ['2026-10-04', 'EJ-0008', 'ARZ-500', 'Arroz Diana 500 g', 'Granos', '3', '3200', '0', '', 'efectivo', 'Julián'],
  ['2026-10-04', 'EJ-0008', 'ARZ-500', 'Arroz Diana 500 g', 'Granos', '3', '3200', '0', '', 'efectivo', 'Julián'],
  ['2026-10-05', 'EJ-0009', 'AVE-400', 'Avena 400 g', 'Granos', '1', '5200', '0', 'C-112', 'efectivo', 'Marta'],
]

// Arma un CSV (con BOM, para que Excel en Windows muestre bien las tildes)
export function aCsv(encabezados, filas) {
  const celda = (v) => {
    const t = String(v ?? '')
    return /[",;\n]/.test(t) ? `"${t.replaceAll('"', '""')}"` : t
  }
  return '\uFEFF' + [encabezados, ...filas].map((f) => f.map(celda).join(',')).join('\r\n') + '\r\n'
}

export function csvPlantilla() {
  return aCsv(NOMBRES, FILAS_PLANTILLA)
}

export function archivoEjemplo() {
  const texto = aCsv([...NOMBRES, 'vendedor'], FILAS_EJEMPLO)
  return new File([texto], 'ventas_ejemplo.csv', { type: 'text/csv' })
}
