// @vitest-environment jsdom
window.matchMedia ??= (q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })
import { StrictMode } from 'react'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { test, expect, beforeEach, afterEach, vi } from 'vitest'
import App from './App.jsx'
import ProveedorSesion from './sesion/ProveedorSesion.jsx'
import Cambio from './components/Cambio.jsx'
import { reiniciarDatosFalsos } from './api/datosFalsos.js'
import { resumenFalso } from './api/indicadoresFalsos.js'
import * as cliente from './api/cliente.js'

globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }
const montar = (ruta) => render(<StrictMode><MemoryRouter initialEntries={[ruta]}><ProveedorSesion><App /></ProveedorSesion></MemoryRouter></StrictMode>)
beforeEach(() => { localStorage.clear(); reiniciarDatosFalsos(); localStorage.setItem('token', 'token-falso.1') })
afterEach(() => { cleanup(); vi.restoreAllMocks() })
const T = { timeout: 5000 }

test('Datos de ejemplo: un período cargado a medias no calcula crecimiento (igual que en Python)', async () => {
  // Abril es el primer mes con ventas: marzo está vacío
  const abril = await resumenFalso('token-falso.1', { desde: '2026-04-01', hasta: '2026-04-30' })
  expect(abril.crecimiento.valor).toBeNull()
  expect(abril.crecimiento.periodo_incompleto).toBe(true)
  expect(abril.crecimiento.frase).toMatch(/No comparamos con marzo porque tus ventas cargadas empiezan el 1 de abril/)
  // Un período que termina después de la última venta
  const otono = await resumenFalso('token-falso.1', { desde: '2026-09-01', hasta: '2026-10-31' })
  expect(otono.crecimiento.periodo_incompleto).toBe(true)
  expect(otono.crecimiento.frase).toMatch(/Todavía no comparamos este período: tus ventas cargadas llegan hasta el 30 de septiembre/)
  // Un mes completo con su mes anterior completo sí se compara
  const sep = await resumenFalso('token-falso.1', { desde: '2026-09-01', hasta: '2026-09-30' })
  expect(sep.crecimiento.periodo_incompleto).toBe(false)
  expect(typeof sep.crecimiento.valor).toBe('number')
})

test('Cambio sin valor no muestra número ni flecha', () => {
  const { container } = render(<Cambio valor={null} />)
  expect(container.textContent).toBe('')
})

test('P06: al elegir un mes incompleto sale el aviso junto a los filtros y no hay flecha ni comparación', async () => {
  montar('/tablero')
  await screen.findByText('Ventas por semana', {}, T)
  expect(screen.getByText(/comparado con agosto/)).toBeTruthy()
  const [selMes] = screen.getAllByRole('combobox')
  const abril = [...selMes.querySelectorAll('option')].find((o) => /abril/i.test(o.textContent))
  fireEvent.change(selMes, { target: { value: abril.value } })
  const aviso = await screen.findByText(/No comparamos con marzo porque tus ventas cargadas empiezan/, { selector: '.aviso' }, T)
  expect(aviso).toBeTruthy()
  await waitFor(() => expect(screen.queryByText(/comparado con/)).toBeNull(), T)
  expect(screen.queryByText(/Subió|Bajó/)).toBeNull()
  expect(screen.queryByText(/Comparar con/)).toBeNull()
})

test('P02 no se rompe con crecimiento vacío: muestra solo la frase del backend', async () => {
  const real = cliente.resumenIndicadores
  vi.spyOn(cliente, 'resumenIndicadores').mockImplementation(async (...args) => {
    const r = await real(...args)
    return { ...r, crecimiento: { valor: null, periodo_incompleto: true, frase: 'No comparamos con agosto porque tus ventas cargadas empiezan el 20 de agosto: ese período está incompleto.' } }
  })
  montar('/inicio')
  await screen.findByText(/Vendiste en septiembre/, {}, T)
  expect(screen.getByText(/No comparamos con agosto porque tus ventas cargadas empiezan el 20 de agosto/)).toBeTruthy()
  expect(screen.queryByText(/Subió|Bajó/)).toBeNull()
})
