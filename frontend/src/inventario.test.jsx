// @vitest-environment jsdom
window.matchMedia ??= (q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })
import { StrictMode } from 'react'
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { test, expect, beforeEach, afterEach, vi } from 'vitest'
import App from './App.jsx'
import ProveedorSesion from './sesion/ProveedorSesion.jsx'
import { guardar, leer, reiniciarDatosFalsos } from './api/datosFalsos.js'
import { agotamientosFalsos } from './api/inventarioFalsos.js'
import * as cliente from './api/cliente.js'

const montar = (ruta) => render(<StrictMode><MemoryRouter initialEntries={[ruta]}><ProveedorSesion><App /></ProveedorSesion></MemoryRouter></StrictMode>)
beforeEach(() => { localStorage.clear(); reiniciarDatosFalsos(); localStorage.setItem('token', 'token-falso.1') })
afterEach(() => { cleanup(); vi.restoreAllMocks() })
const T = { timeout: 5000 }

test('Ruta 23 (ejemplo): confirmado solo con conteo en 0; sin conteo es «posible»', async () => {
  const r = await agotamientosFalsos('token-falso.1')
  const tipo = Object.fromEntries(r.productos.map((p) => [p.producto.codigo, p]))
  expect(tipo['YOG-1L'].tipo).toBe('confirmado')
  expect(tipo['DET-1K'].tipo).toBe('con_existencias')
  expect(tipo['ATU-170'].tipo).toBe('posible')
  expect(tipo['ATU-170'].confianza).toBe('baja')
  // Nunca «se agotó» sin un conteo en cero
  for (const p of r.productos) {
    if (p.tipo !== 'confirmado') expect(p.mensaje.toLowerCase()).not.toContain('se agotó')
  }
  expect(r.resumen).toEqual({ confirmado: 1, posible: 1, con_existencias: 1 })
})

test('P15 muestra los tres tipos y un conteo con error por fila confirma el agotamiento', async () => {
  montar('/inventario')
  expect(await screen.findByRole('link', { name: /^Inventario$/ }, T)).toBeTruthy()
  await screen.findByRole('heading', { name: 'Productos que dejaron de venderse' }, T)
  const seccion = () => screen.getByRole('heading', { name: 'Productos que dejaron de venderse' }).closest('section')
  await within(seccion()).findByText('Atún 170 g', {}, T)
  const fila = (nombre) => within(seccion()).getByText(nombre).closest('li')
  expect(within(fila('Yogur 1 L')).getByText('Agotado confirmado')).toBeTruthy()
  expect(within(fila('Detergente 1 kg')).getByText('Tenía existencias: no fue agotamiento')).toBeTruthy()
  expect(within(fila('Atún 170 g')).getByText('Posible agotamiento (sin conteo)')).toBeTruthy()

  const csv = 'fecha,codigo_producto,existencias\n2026-09-29,ATU-170,0\n2026-09-29,XXX,4\n'
  fireEvent.change(screen.getByLabelText(/Arrastra aquí tu conteo/), { target: { files: [new File([csv], 'conteo.csv')] } })
  await screen.findByText(/conteo.csv: guardamos 1 conteo\. 1 fila con error no se guardó\./, {}, T)
  expect(screen.getByText('Fila 3: el producto «XXX» no está en tu catálogo.')).toBeTruthy()
  // Ahora el atún tiene un conteo en 0: pasa a confirmado
  await within(seccion()).findByText(/conteo del 29\/09\/2026 dice 0 unidades/, {}, T)
  expect(within(fila('Atún 170 g')).getByText('Agotado confirmado')).toBeTruthy()
})

test('Cuánto hay de cada producto: los más vendidos con su último conteo; sin conteos, invita a subir uno', async () => {
  montar('/inventario')
  const seccion = (await screen.findByRole('heading', { name: 'Cuánto hay de cada producto' }, T)).closest('section')
  const fila = async (nombre) => (await within(seccion).findByText(nombre, {}, T)).closest('li')
  expect(within(await fila('Leche entera 1 L')).getByText('Se acabó')).toBeTruthy()
  expect(within(await fila('Arroz Diana 500 g')).getByText('Hay 12 unidades')).toBeTruthy()
  expect(within(seccion).getAllByText('Sin contar').length).toBeGreaterThan(0)
  cleanup()

  // Tienda sin conteos: todavía no sabemos qué hay
  const db = leer()
  db.conteos = []
  guardar(db)
  montar('/inventario')
  await screen.findByText('Sube tu primer conteo para saber cuánto hay de cada producto y cuáles se acabaron.', {}, T)
  expect(screen.queryByText('Se acabó')).toBeNull()
}, 15000)

test('Cuánto hay une ventas y conteos por id_producto (contrato 0.8), aunque el nombre cambie', async () => {
  const real = cliente.listarConteos
  vi.spyOn(cliente, 'listarConteos').mockImplementation(async (...args) => {
    const lista = await real(...args)
    // Mismo producto (mismo id) con otro nombre en el conteo: igual debe unirse
    return lista.map((c) => (c.codigo === 'LEC-1L' ? { ...c, producto: 'Leche 1 litro (nombre viejo)' } : c))
  })
  montar('/inventario')
  const seccion = (await screen.findByRole('heading', { name: 'Cuánto hay de cada producto' }, T)).closest('section')
  const fila = (await within(seccion).findByText('Leche entera 1 L', {}, T)).closest('li')
  expect(within(fila).getByText('Se acabó')).toBeTruthy()
})
