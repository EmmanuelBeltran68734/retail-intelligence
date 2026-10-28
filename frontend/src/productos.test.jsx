// @vitest-environment jsdom
window.matchMedia ??= (q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })
import { StrictMode } from 'react'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { test, expect, beforeEach, afterEach } from 'vitest'
import App from './App.jsx'
import ProveedorSesion from './sesion/ProveedorSesion.jsx'
import { reiniciarDatosFalsos } from './api/datosFalsos.js'
import { abcFalso } from './api/indicadoresFalsos.js'

const montar = (ruta) => render(<StrictMode><MemoryRouter initialEntries={[ruta]}><ProveedorSesion><App /></ProveedorSesion></MemoryRouter></StrictMode>)
beforeEach(() => { localStorage.clear(); reiniciarDatosFalsos(); localStorage.setItem('token', 'token-falso.1') })
afterEach(cleanup)
const T = { timeout: 5000 }

test('Ruta 18 (ejemplo): regla del ABC igual que en el backend', async () => {
  const r = await abcFalso('token-falso.1', { desde: '2026-09-01', hasta: '2026-09-30' })
  expect(r.sin_datos).toBe(false)
  expect(r.cortes).toEqual({ A: 80, B: 95 })
  const p = r.productos
  expect(p[0].grupo).toBe('A')
  for (let i = 1; i < p.length; i++) {
    expect(p[i].ventas).toBeLessThanOrEqual(p[i - 1].ventas)
    const antes = p[i - 1].porcentaje_acumulado
    expect(p[i].grupo).toBe(antes < 80 ? 'A' : antes < 95 ? 'B' : 'C')
  }
  expect(Math.round(p.at(-1).porcentaje_acumulado)).toBe(100)
  expect(r.resumen.reduce((s, g) => s + g.productos, 0)).toBe(p.length)
})

test('P07 muestra grupos, filtra la tabla por grupo y por categoría', async () => {
  montar('/productos-clave')
  await screen.findByText(/hacen el .* de tus ventas/, {}, T)
  expect(screen.getByText('No te pueden faltar')).toBeTruthy()
  const filas = () => screen.getAllByRole('row').length - 1
  const todas = filas()
  expect(todas).toBeGreaterThan(5)
  fireEvent.click(screen.getByRole('button', { name: /No te pueden faltar/ }))
  expect(filas()).toBeLessThan(todas)
  expect(screen.getByText(/Grupo A: no te pueden faltar/)).toBeTruthy()
  fireEvent.click(screen.getByText('Ver todos'))
  expect(filas()).toBe(todas)
  const [, selCat] = screen.getAllByRole('combobox')
  await waitFor(() => expect(selCat.querySelectorAll('option').length).toBeGreaterThan(3))
  const bebidas = [...selCat.querySelectorAll('option')].find((o) => o.textContent === 'Bebidas')
  fireEvent.change(selCat, { target: { value: bebidas.value } })
  await screen.findByText(/solo Bebidas/, {}, T)
  await waitFor(() => expect(filas()).toBeLessThan(todas), T)
})
