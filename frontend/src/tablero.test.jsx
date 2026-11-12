// @vitest-environment jsdom
window.matchMedia ??= (q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })
import { StrictMode } from 'react'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { test, expect, beforeEach, afterEach, vi } from 'vitest'
import App from './App.jsx'
import ProveedorSesion from './sesion/ProveedorSesion.jsx'
import { reiniciarDatosFalsos } from './api/datosFalsos.js'

globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }
const montar = (ruta) => render(<StrictMode><MemoryRouter initialEntries={[ruta]}><ProveedorSesion><App /></ProveedorSesion></MemoryRouter></StrictMode>)
beforeEach(() => { localStorage.clear(); reiniciarDatosFalsos(); localStorage.setItem('token', 'token-falso.1') })
afterEach(cleanup)
const T = { timeout: 5000 }

test('P02 muestra septiembre con datos de ejemplo', async () => {
  montar('/inicio')
  await screen.findByText(/Vendiste en septiembre/, {}, T)
  expect(screen.getByRole('heading', { name: /Marta/ })).toBeTruthy()
  expect(screen.getByText(/Tu mejor día fue el/)).toBeTruthy()
  expect(screen.getByText(/más que en agosto|menos que en agosto/)).toBeTruthy()
  expect(screen.getByText('Tus últimas 8 semanas')).toBeTruthy()
  expect(screen.queryByText(/último mes completo/)).toBeNull()
})

test('P06 filtros: trimestre, semana, categoría y mes', async () => {
  montar('/tablero')
  await screen.findByText('Ventas por semana', {}, T)
  expect(screen.getByText(/Del 1 al 30 de septiembre de 2026/)).toBeTruthy()
  expect(screen.getByText(/comparado con agosto/)).toBeTruthy()
  expect(screen.getAllByRole('listitem').length).toBeGreaterThan(5)
  fireEvent.click(screen.getByRole('button', { name: 'Trimestre' }))
  await screen.findByText(/Del 1 de julio al 30 de septiembre de 2026/, {}, T)
  fireEvent.click(screen.getByRole('button', { name: 'Semana' }))
  await screen.findByText('Ventas por día', {}, T)
  await screen.findByText(/Del 24 al 30 de septiembre/, {}, T)
  fireEvent.click(screen.getByRole('button', { name: 'Mes' }))
  const [, selCat] = screen.getAllByRole('combobox')
  await waitFor(() => expect(selCat.querySelectorAll('option').length).toBeGreaterThan(3))
  const bebidas = [...selCat.querySelectorAll('option')].find((o) => o.textContent === 'Bebidas')
  fireEvent.change(selCat, { target: { value: bebidas.value } })
  await screen.findByText(/solo Bebidas/, {}, T)
  await waitFor(() => expect(screen.queryByText(/actualizando/)).toBeNull(), T)
  const [selMes] = screen.getAllByRole('combobox')
  fireEvent.change(selMes, { target: { value: '2026-04-01' } })
  await screen.findByText(/Del 1 al 30 de abril de 2026/, {}, T)
  await waitFor(() => expect(screen.queryByText(/actualizando/)).toBeNull(), T)
  // Abril es el primer mes con ventas: marzo está vacío, así que es un período incompleto (contrato 0.7, O5)
  expect(screen.getAllByText(/No comparamos con marzo porque tus ventas cargadas empiezan el 1 de abril/).length).toBeGreaterThan(0)
})

test('Tienda nueva sin ventas: invitación a cargar', async () => {
  localStorage.clear(); reiniciarDatosFalsos()
  const { registro } = await import('./api/datosFalsos.js')
  const r = await registro({ comercio: 'Tienda Nueva', ciudad: 'Cartagena', nombre: 'Ana Ruiz', correo: 'ana@x.co', contrasena: '12345678' })
  localStorage.setItem('token', r.token)
  montar('/inicio')
  await screen.findByText('Todavía no tenemos ventas tuyas', {}, T)
  cleanup()
  montar('/tablero')
  await screen.findByText('Todavía no tenemos ventas tuyas', {}, T)
})

test('Después de guardar el archivo de ejemplo, octubre aparece y P02 avisa', async () => {
  montar('/cargar')
  fireEvent.click(await screen.findByText('Probar con el archivo de ejemplo', {}, T))
  fireEvent.click(await screen.findByText('Guardar las 7 que están bien', {}, T))
  fireEvent.click(await screen.findByText('Ver mi resumen', {}, T))
  await screen.findByText(/Vendiste en septiembre/, {}, T)
  expect(screen.getByText(/último mes completo/)).toBeTruthy()
  expect(screen.getByText(/ventas_ejemplo.csv/)).toBeTruthy()
})

test('Modo real: rutas 13, 16 y 17 con filtros en la URL', async () => {
  vi.resetModules()
  vi.stubEnv('VITE_DATOS_FALSOS', 'false')
  const c = await import('./api/cliente.js')
  const urls = []
  globalThis.fetch = vi.fn(async (u) => { urls.push(u); return new Response('{}', { status: 200 }) })
  await c.listarCategorias('T')
  await c.resumenIndicadores('T', { desde: '2026-09-01', hasta: '2026-09-30', categoria_id: undefined })
  await c.serieVentas('T', 'producto', { desde: '2026-09-01', hasta: '2026-09-30', categoria_id: '3', limite: 5 })
  expect(urls).toEqual([
    'http://127.0.0.1:8000/api/catalogo/categorias',
    'http://127.0.0.1:8000/api/indicadores/resumen?desde=2026-09-01&hasta=2026-09-30',
    'http://127.0.0.1:8000/api/indicadores/ventas?agrupar=producto&desde=2026-09-01&hasta=2026-09-30&categoria_id=3&limite=5',
  ])
  vi.unstubAllEnvs()
})

test('P06 interacciones: categoría, día, top 10, comparar y tabla', async () => {
  montar('/tablero')
  await screen.findByText('Ventas por semana', {}, T)
  await waitFor(() => expect(screen.queryByText(/actualizando/)).toBeNull(), T)
  // detalle fijo de la semana más alta
  expect(screen.getByText(/La semana más alta:/)).toBeTruthy()
  // tabla
  fireEvent.click(screen.getByText('Ver como tabla'))
  expect(screen.getAllByRole('table').length).toBeGreaterThan(0)
  fireEvent.click(screen.getByText('Ver como gráfico'))
  // comparar con agosto
  fireEvent.click(screen.getByLabelText(/Comparar con agosto/))
  expect(screen.getByText('Este período')).toBeTruthy()
  // día de la semana
  fireEvent.click(screen.getByRole('button', { name: /^sábado:/ }))
  expect(screen.getByText(/Sábado:/)).toBeTruthy()
  // top 10
  fireEvent.click(screen.getByRole('button', { name: 'Top 10' }))
  expect(document.querySelectorAll('.top-productos li').length).toBe(10)
  // clic en una categoría filtra todo el tablero
  fireEvent.click(screen.getByTitle('Ver solo Bebidas'))
  await screen.findByText(/solo Bebidas/, {}, T)
  expect(screen.getByText(/Quitar filtro: Bebidas/)).toBeTruthy()
  fireEvent.click(screen.getByText('Ver todas las categorías'))
  await waitFor(() => expect(screen.queryByText(/solo Bebidas/)).toBeNull(), T)
})

test('P02 permite comparar con las 8 semanas anteriores', async () => {
  montar('/inicio')
  await screen.findByText(/Vendiste en septiembre/, {}, T)
  fireEvent.click(screen.getByLabelText(/Comparar con las 8 semanas anteriores/))
  expect(screen.getByText('Este período')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Meses' }))
  expect(screen.queryByLabelText(/Comparar con los/)).toBeNull()
})
