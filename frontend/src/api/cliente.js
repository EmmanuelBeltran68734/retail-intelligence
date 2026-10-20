// Todas las llamadas a la API pasan por aquí.
// Con VITE_DATOS_FALSOS=true (por defecto) se usan los datos falsos de datosFalsos.js.
// Cuando el backend de Emmanuel esté listo, se pone VITE_DATOS_FALSOS=false en el archivo .env
// y las pantallas no cambian, porque las respuestas tienen la misma forma.
import * as falsos from './datosFalsos.js'

export const USAR_DATOS_FALSOS = import.meta.env.VITE_DATOS_FALSOS !== 'false'
const BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'

// Llamada real al backend. Si responde con error, lanza { status, error, mensaje } como dice el contrato.
async function pedir(metodo, ruta, { token, cuerpo } = {}) {
  let respuesta
  try {
    respuesta = await fetch(BASE + ruta, {
      method: metodo,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    })
  } catch {
    const e = new Error('No pudimos conectarnos con el servidor. Revisa tu internet e intenta de nuevo.')
    e.status = 0
    e.error = 'sin_conexion'
    e.mensaje = e.message
    throw e
  }
  if (respuesta.status === 204) return null
  const datos = await respuesta.json().catch(() => null)
  if (!respuesta.ok) {
    const e = new Error(datos?.mensaje || 'Algo salió mal. Intenta de nuevo.')
    e.status = respuesta.status
    e.error = datos?.error || 'error_desconocido'
    e.mensaje = e.message
    throw e
  }
  return datos
}

// ---------- RF-01 · Usuarios y acceso ----------

// 1. POST /auth/registro
export const registrar = (datos) =>
  USAR_DATOS_FALSOS ? falsos.registro(datos) : pedir('POST', '/auth/registro', { cuerpo: datos })

// 2. POST /auth/login
export const iniciarSesion = (datos) =>
  USAR_DATOS_FALSOS ? falsos.login(datos) : pedir('POST', '/auth/login', { cuerpo: datos })

// 3. GET /auth/yo
export const obtenerUsuarioActual = (token) =>
  USAR_DATOS_FALSOS ? falsos.yo(token) : pedir('GET', '/auth/yo', { token })

// 4. GET /usuarios
export const listarUsuarios = (token) =>
  USAR_DATOS_FALSOS ? falsos.listarUsuarios(token) : pedir('GET', '/usuarios', { token })

// 5. POST /usuarios
export const crearUsuario = (token, datos) =>
  USAR_DATOS_FALSOS ? falsos.crearUsuario(token, datos) : pedir('POST', '/usuarios', { token, cuerpo: datos })

// 6. PATCH /usuarios/{id}
export const cambiarUsuario = (token, id, datos) =>
  USAR_DATOS_FALSOS
    ? falsos.cambiarUsuario(token, id, datos)
    : pedir('PATCH', `/usuarios/${id}`, { token, cuerpo: datos })
