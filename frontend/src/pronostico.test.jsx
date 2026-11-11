// @vitest-environment jsdom
window.matchMedia ??= (q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })
import { StrictMode } from 'react'
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { test, expect, beforeEach, afterEach, vi } from 'vitest'
import App from './App.jsx'
import ProveedorSesion from './sesion/ProveedorSesion.jsx'
import TarjetaPronostico from './components/TarjetaPronostico.jsx'
import { reiniciarDatosFalsos } from './api/datosFalsos.js'
import * as cliente from './api/cliente.js'

globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }
const montar = (ruta) => render(<StrictMode><MemoryRouter initialEntries={[ruta]}><ProveedorSesion><App /></ProveedorSesion></MemoryRouter></StrictMode>)
beforeEach(() => { localStorage.clear(); reiniciarDatosFalsos(); localStorage.setItem('token', 'token-falso.1') })
afterEach(() => { cleanup(); vi.restoreAllMocks() })
const T = { timeout: 5000 }

test('P02 muestra el pronóstico de 4 semanas con rango, confianza, modelo y ejecución', async () => {
  montar('/inicio')
  const titulo = await screen.findByRole('heading', { name: 'Pronóstico de las próximas 4 semanas' }, T)
  const tarjeta = titulo.closest('section')
  await within(tarjeta).findByText('Confianza alta', {}, T)
  expect(within(tarjeta).getAllByRole('listitem')).toHaveLength(4)
  expect(within(tarjeta).getAllByText(/^entre \$/)).toHaveLength(4)
  expect(within(tarjeta).getByText(/Ejecución #7 · modelo v1\.1\.0 · Holt-Winters/)).toBeTruthy()
  // Otra categoría: cambia el modelo y la confianza (observación O4)
  fireEvent.change(within(tarjeta).getByRole('combobox'), { target: { value: '2' } })
  expect(within(tarjeta).getByText('Confianza baja')).toBeTruthy()
  expect(within(tarjeta).getByText(/modelo v1\.1\.0 · Promedio de las últimas semanas/)).toBeTruthy()
})

test('Sin semanas suficientes: mensaje claro en vez de cifras', async () => {
  vi.spyOn(cliente, 'pronosticoVentas').mockResolvedValue({
    sin_datos: true, id_ejecucion: null, version_modelo: null, series: [],
    mensaje: 'Para pronosticar necesitamos al menos 8 semanas completas de ventas y llevas 3.',
  })
  render(<TarjetaPronostico token="token-falso.1" />)
  await screen.findByText(/necesitamos al menos 8 semanas/)
  expect(screen.queryByText(/Confianza/)).toBeNull()
  expect(screen.queryByText(/Ejecución #/)).toBeNull()
})

test('Si la ruta todavía no existe, la tarjeta avisa y no rompe la página', async () => {
  vi.spyOn(cliente, 'pronosticoVentas').mockRejectedValue({ status: 404, mensaje: 'Not Found' })
  render(<TarjetaPronostico token="token-falso.1" />)
  await screen.findByText(/todavía no está disponible/)
})
