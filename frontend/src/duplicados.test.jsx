// @vitest-environment jsdom
window.matchMedia ??= (q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })
import { StrictMode } from 'react'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { test, expect, beforeEach, afterEach } from 'vitest'
import App from './App.jsx'
import ProveedorSesion from './sesion/ProveedorSesion.jsx'
import { reiniciarDatosFalsos } from './api/datosFalsos.js'
import { NOMBRES, aCsv } from './plantilla.js'

const montar = (ruta) => render(<StrictMode><MemoryRouter initialEntries={[ruta]}><ProveedorSesion><App /></ProveedorSesion></MemoryRouter></StrictMode>)
beforeEach(() => { localStorage.clear(); reiniciarDatosFalsos(); localStorage.setItem('token', 'token-falso.1') })
afterEach(cleanup)
const T = { timeout: 3000 }

// Arma un archivo CSV con las columnas de la plantilla
const fila = (fecha, ticket) => [fecha, ticket, 'ARZ-500', 'Arroz Diana 500 g', 'Granos', '1', '3200', '0', '', 'efectivo']
const archivo = (nombre, filas) => new File([aCsv(NOMBRES, filas)], nombre, { type: 'text/csv' })
const subir = (f) => fireEvent.change(screen.getByLabelText(/Arrastra aquí/), { target: { files: [f] } })

async function subirYGuardar(f) {
  subir(f)
  await screen.findByRole('heading', { name: 'Revisamos tu archivo' }, T)
  fireEvent.click(screen.getByRole('button', { name: /^Guardar/ }))
  fireEvent.click(await screen.findByText('Cargar otro archivo', {}, T))
  await screen.findByRole('table', {}, T)
}

test('P03: el mismo archivo dos veces se rechaza con su mensaje y lleva a la carga anterior', async () => {
  montar('/cargar')
  await screen.findByText(/Todavía no has subido/, {}, T)
  const original = archivo('ventas_noviembre.csv', [fila('2026-11-02', 'N-1'), fila('2026-11-03', 'N-2')])
  await subirYGuardar(original)
  // Mismo contenido, otro nombre: igual es el mismo archivo
  subir(archivo('copia_de_ventas.csv', [fila('2026-11-02', 'N-1'), fila('2026-11-03', 'N-2')]))
  await screen.findByText(/Este archivo ya lo subiste .*\(ventas_noviembre\.csv\)/, {}, T)
  expect(screen.queryByRole('heading', { name: 'Revisamos tu archivo' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Ver la carga anterior' }))
  await screen.findByText(/Esta carga ya se guardó/, {}, T)
})

test('P04: tickets ya guardados y fechas cruzadas aparecen en amarillo antes del botón Guardar', async () => {
  montar('/cargar')
  await screen.findByText(/Todavía no has subido/, {}, T)
  await subirYGuardar(archivo('semana_1.csv', [fila('2026-11-02', 'N-1'), fila('2026-11-03', 'N-2')]))
  // Otro archivo que repite el ticket N-2 y trae ventas de días ya cargados
  subir(archivo('semana_1_corregida.csv', [fila('2026-11-03', 'N-2'), fila('2026-11-03', 'N-3'), fila('2026-11-04', 'N-4')]))
  await screen.findByRole('heading', { name: 'Revisamos tu archivo' }, T)
  const aviso = screen.getByText('Antes de guardar, revisa esto:').closest('.aviso')
  expect(aviso.className).toContain('advertencia')
  expect(aviso.textContent).toMatch(/El ticket N-2 del 3 nov ya estaba guardado/)
  expect(aviso.textContent).toMatch(/Ya tenías ventas guardadas del 3 nov, y este archivo también trae ventas de ese día/)
  const guardar = screen.getByRole('button', { name: /^Guardar/ })
  // El aviso va ANTES del botón en la página
  expect(aviso.compareDocumentPosition(guardar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
})

test('P04 sin advertencias: no aparece el aviso amarillo', async () => {
  montar('/cargar')
  await screen.findByText(/Todavía no has subido/, {}, T)
  subir(archivo('nuevo.csv', [fila('2026-11-02', 'N-1')]))
  await screen.findByRole('heading', { name: 'Revisamos tu archivo' }, T)
  expect(screen.queryByText('Antes de guardar, revisa esto:')).toBeNull()
})
