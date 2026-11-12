// @vitest-environment jsdom
window.matchMedia ??= (q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })
import { StrictMode } from 'react'
import { render, screen, fireEvent, cleanup, within, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { test, expect, beforeEach, afterEach, vi } from 'vitest'
import App from './App.jsx'
import ProveedorSesion from './sesion/ProveedorSesion.jsx'
import { reiniciarDatosFalsos } from './api/datosFalsos.js'

function montar(ruta) {
  return render(<StrictMode><MemoryRouter initialEntries={[ruta]}><ProveedorSesion><App /></ProveedorSesion></MemoryRouter></StrictMode>)
}
const guardados = []
beforeEach(() => {
  localStorage.clear(); reiniciarDatosFalsos()
  localStorage.setItem('token', 'token-falso.1')
  guardados.length = 0
  URL.createObjectURL = vi.fn((b) => { guardados.push(b); return 'blob:x' })
  URL.revokeObjectURL = vi.fn()
  HTMLAnchorElement.prototype.click = vi.fn()
})
afterEach(cleanup)

test('P03 → P04 → P05 con el archivo de ejemplo', async () => {
  montar('/cargar')
  await screen.findByRole('heading', { name: 'Cargar ventas' })
  await screen.findByText(/Todavía no has subido/)
  fireEvent.click(screen.getByText('Probar con el archivo de ejemplo'))
  await screen.findByRole('heading', { name: 'Revisamos tu archivo' }, { timeout: 3000 })
  expect(screen.getByText(/ventas_ejemplo.csv · 12 filas/)).toBeTruthy()
  expect(screen.getByText('La fecha 31/02/2026 no existe.')).toBeTruthy()
  expect(screen.getByText(/Fila 12 · fila repetida/)).toBeTruthy()
  expect(screen.getByText('vendedor')).toBeTruthy()
  // descargar errores
  fireEvent.click(screen.getByText('Descargar la lista de errores'))
  const csv = await guardados[0].text()
  expect(csv).toContain('fila,columna,valor,que_paso,como_arreglarlo')
  expect(csv.split('\r\n').length).toBe(7)
  fireEvent.click(screen.getByText('Guardar las 7 que están bien'))
  await screen.findByText(/¡Listo, Marta! Guardamos 7 ventas/, {}, { timeout: 3000 })
  expect(screen.getByText('$63.400')).toBeTruthy()
  expect(screen.getByText(/Avena 400 g · Granos/)).toBeTruthy()
  expect(screen.getByText(/5 filas con errores no se guardaron/)).toBeTruthy()
  // volver a P03: historial
  fireEvent.click(screen.getByText('Cargar otro archivo'))
  const tabla = await screen.findByRole('table')
  expect(within(tabla).getByText('Guardada')).toBeTruthy()
  // subir el mismo archivo otra vez: ahora se avisa que está repetido (observación O5, ver duplicados.test.jsx)
  fireEvent.click(screen.getByText('Probar con el archivo de ejemplo'))
  await screen.findByText(/Este archivo ya lo subiste/, {}, { timeout: 3000 })
})

test('Descartar y archivo sin columnas', async () => {
  montar('/cargar')
  await screen.findByText(/Todavía no has subido/)
  const malo = new File(['producto,valor\nArroz,3200\n'], 'malo.csv')
  fireEvent.change(screen.getByLabelText(/Arrastra aquí/), { target: { files: [malo] } })
  await screen.findByText(/le faltan columnas obligatorias/, {}, { timeout: 3000 })
  expect(screen.getByText('precio_unitario')).toBeTruthy()
  const xls = new File(['x'], 'viejo.xls')
  fireEvent.change(screen.getByLabelText(/Arrastra aquí/), { target: { files: [xls] } })
  await screen.findByText(/Excel antiguo/)
  fireEvent.click(screen.getByText('Probar con el archivo de ejemplo'))
  await screen.findByRole('heading', { name: 'Revisamos tu archivo' }, { timeout: 3000 })
  fireEvent.click(screen.getByText('Descartar y subir otro archivo'))
  fireEvent.click(screen.getByText('Sí, descartar'))
  await screen.findByRole('heading', { name: 'Cargar ventas' }, { timeout: 3000 })
  const tabla = await screen.findByRole('table')
  expect(within(tabla).getAllByText('Descartada').length).toBe(2)
})

test('Volver a P04 desde el historial y recargar P04', async () => {
  montar('/cargar')
  await screen.findByText(/Todavía no has subido/)
  fireEvent.click(screen.getByText('Probar con el archivo de ejemplo'))
  await screen.findByRole('heading', { name: 'Revisamos tu archivo' }, { timeout: 3000 })
  cleanup()
  montar('/cargar/carga-1')
  await screen.findByText('La fecha 31/02/2026 no existe.', {}, { timeout: 3000 })
  cleanup()
  montar('/cargar')
  fireEvent.click(await screen.findByText('ventas_ejemplo.csv', {}, { timeout: 3000 }))
  await screen.findByRole('heading', { name: 'Revisamos tu archivo' }, { timeout: 3000 })
  cleanup()
  montar('/cargar/no-existe')
  await screen.findByText('No encontramos esa carga en tu comercio.', {}, { timeout: 3000 })
})

test('P13 descarga la plantilla CSV; Excel avisa en modo ejemplo', async () => {
  montar('/guia-plantilla')
  await screen.findByRole('heading', { name: 'Cómo llenar la plantilla' })
  expect(screen.getAllByRole('row').length).toBe(11)
  fireEvent.click(screen.getByText('Plantilla en CSV'))
  await waitFor(() => expect(guardados.length).toBe(1))
  const t = (await guardados[0].text()).replace(/^\uFEFF/, '')
  expect(t.startsWith('fecha,id_ticket')).toBe(true)
  fireEvent.click(screen.getByText('Plantilla en Excel'))
  await screen.findByText(/solo se descarga la plantilla en CSV/)
})

test('La plantilla descargada pasa la revisión sin errores', async () => {
  montar('/guia-plantilla')
  fireEvent.click(await screen.findByText('Plantilla en CSV'))
  await waitFor(() => expect(guardados.length).toBe(1))
  const f = new File([await guardados[0].text()], 'plantilla_ventas.csv')
  cleanup()
  montar('/cargar')
  await screen.findByText(/Todavía no has subido/)
  fireEvent.change(screen.getByLabelText(/Arrastra aquí/), { target: { files: [f] } })
  await screen.findByText(/Todo está bien/, {}, { timeout: 3000 })
  expect(screen.getByText('Guardar las 3 ventas')).toBeTruthy()
})
