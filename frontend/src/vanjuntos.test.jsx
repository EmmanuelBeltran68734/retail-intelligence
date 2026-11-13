// @vitest-environment jsdom
window.matchMedia ??= (q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })
import { StrictMode } from 'react'
import { render, screen, cleanup, within, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { test, expect, beforeEach, afterEach, vi } from 'vitest'
import App from './App.jsx'
import ProveedorSesion from './sesion/ProveedorSesion.jsx'
import { reiniciarDatosFalsos } from './api/datosFalsos.js'
import { asociacionesFalsas } from './api/indicadoresFalsos.js'
import * as cliente from './api/cliente.js'

const montar = (ruta) => render(<StrictMode><MemoryRouter initialEntries={[ruta]}><ProveedorSesion><App /></ProveedorSesion></MemoryRouter></StrictMode>)
beforeEach(() => { localStorage.clear(); reiniciarDatosFalsos(); localStorage.setItem('token', 'token-falso.1') })
afterEach(() => { cleanup(); vi.restoreAllMocks() })
const T = { timeout: 5000 }

test('Asociaciones (ejemplo): misma cuenta que asociaciones.py', async () => {
  const r = await asociacionesFalsas('token-falso.1')
  expect(r.total_transacciones).toBeGreaterThan(0)
  const pan = r.asociaciones.find((a) => a.producto_origen === 'Pan tajado' && a.producto_destino === 'Leche entera 1 L')
  expect(pan.lift).toBeGreaterThan(1)
  // lift = confianza / frecuencia general del segundo producto: las dos reglas de una pareja tienen el mismo lift
  const inversa = r.asociaciones.find((a) => a.producto_origen === 'Leche entera 1 L' && a.producto_destino === 'Pan tajado')
  expect(inversa.lift).toBe(pan.lift)
  for (let i = 1; i < r.asociaciones.length; i++) expect(r.asociaciones[i].lift).toBeLessThanOrEqual(r.asociaciones[i - 1].lift)
})

test('P11 compara con lo habitual: confianza, frecuencia general y cuántas veces más (O1)', async () => {
  vi.spyOn(cliente, 'productosQueVanJuntos').mockResolvedValue({
    sin_datos: false,
    periodo: { desde: '2026-10-01', hasta: '2026-10-31' },
    total_transacciones: 1000,
    asociaciones: [
      { producto_origen: 'Pan tajado', producto_destino: 'Leche entera 1 L', soporte: 12, confianza: 60, lift: 2, compras_conjuntas: 120 },
      { producto_origen: 'Leche entera 1 L', producto_destino: 'Pan tajado', soporte: 12, confianza: 40, lift: 2, compras_conjuntas: 120 },
      { producto_origen: 'Atún 170 g', producto_destino: 'Panela', soporte: 0.3, confianza: 15, lift: 1.5, compras_conjuntas: 3 },
      { producto_origen: 'Agua 600 ml', producto_destino: 'Café 250 g', soporte: 5, confianza: 10, lift: 1, compras_conjuntas: 50 },
    ],
  })
  montar('/van-juntos')
  await screen.findByText(/Lo calculamos con los tickets del 1 al 31 de octubre de 2026 \(1\.000 compras\)/, {}, T)
  const filas = () => screen.getAllByRole('listitem').filter((li) => li.classList.contains('juntos'))
  // Una sola fila por pareja (la de mayor confianza), sin la pareja que es casualidad (lift 1)
  // y sin las de pocas compras hasta que se pidan
  expect(filas()).toHaveLength(1)
  expect(filas()[0].textContent).toMatch(/De cada 10 clientes que llevan Pan tajado, 6 llevan Leche entera 1 L; en general, solo 3 de cada 10 lo llevan\./)
  expect(within(filas()[0]).getByText('2 veces más de lo normal')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Ver 1 pareja con pocas compras' }))
  expect(filas()).toHaveLength(2)
  expect(within(filas()[1]).getByText('50 % más de lo normal')).toBeTruthy()
  expect(filas()[1].textContent).toMatch(/son pocas compras: tómalo con cuidado/)
  expect(screen.getByText(/la comparación con lo habitual es el lift/)).toBeTruthy()
})
