// @vitest-environment jsdom
import { test, expect, vi } from 'vitest'
test('modo real: rutas 7 a 12', async () => {
  vi.resetModules()
  vi.stubEnv('VITE_DATOS_FALSOS', 'false')
  const c = await import('./api/cliente.js')
  const llamadas = []
  const respuestas = [
    new Response('csv', { status: 200 }),
    new Response(JSON.stringify({ id: 'u1', errores: [] }), { status: 201 }),
    new Response(JSON.stringify({ error: 'columnas_faltantes', mensaje: 'Faltan', faltan: ['fecha'] }), { status: 422 }),
    new Response('[]', { status: 200 }),
    new Response(JSON.stringify({ id: 'u1' }), { status: 200 }),
    new Response(JSON.stringify({ estado: 'validada' }), { status: 200 }),
    new Response(null, { status: 204 }),
  ]
  globalThis.fetch = vi.fn(async (url, op) => { llamadas.push([url, op]); return respuestas.shift() })
  expect(await (await c.descargarPlantilla('xlsx')).text()).toBe('csv')
  expect(llamadas[0][0]).toBe('http://127.0.0.1:8000/api/cargas/plantilla?formato=xlsx')
  expect(llamadas[0][1]).toBeUndefined()
  const f = new File(['a'], 'v.csv')
  await c.subirCarga('T', f)
  const [url, op] = llamadas[1]
  expect(url).toBe('http://127.0.0.1:8000/api/cargas')
  expect(op.method).toBe('POST')
  expect(op.headers['Content-Type']).toBeUndefined()
  expect(op.headers.Authorization).toBe('Bearer T')
  expect(op.body.get('archivo').name).toBe('v.csv')
  await expect(c.subirCarga('T', f)).rejects.toMatchObject({ status: 422, error: 'columnas_faltantes', faltan: ['fecha'] })
  await c.listarCargas('T'); expect(llamadas[3][0]).toMatch(/\/cargas$/)
  await c.verCarga('T', 'u1'); expect(llamadas[4][0]).toMatch(/\/cargas\/u1$/)
  await c.confirmarCarga('T', 'u1'); expect(llamadas[5][0]).toMatch(/\/cargas\/u1\/confirmar$/); expect(llamadas[5][1].body).toBeUndefined(); expect(llamadas[5][1].method).toBe('POST')
  expect(await c.descartarCarga('T', 'u1')).toBeNull(); expect(llamadas[6][1].method).toBe('DELETE')
  vi.unstubAllEnvs()
})
