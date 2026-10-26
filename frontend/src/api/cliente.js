// Todas las llamadas a la API pasan por aquí.
// Con VITE_DATOS_FALSOS=true (por defecto) se usan los datos falsos de datosFalsos.js.
// Cuando el backend de Emmanuel esté listo, se pone VITE_DATOS_FALSOS=false en el archivo .env
// y las pantallas no cambian, porque las respuestas tienen la misma forma.
import * as falsos from './datosFalsos.js'
import * as cargasFalsas from './cargasFalsas.js'

export const USAR_DATOS_FALSOS = import.meta.env.VITE_DATOS_FALSOS !== 'false'
const BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'

// ---------- Aviso de "sesión terminada" ----------
// Si una ruta que usa el token responde 401 (el token venció o ya no sirve),
// se avisa a quien esté escuchando (ProveedorSesion), que cierra la sesión y vuelve a P01.
// Así este archivo no necesita saber nada de React.
let alTerminar = null

// ProveedorSesion se registra aquí. Devuelve una función para dejar de escuchar.
export function alTerminarSesion(funcion) {
  alTerminar = funcion
  return () => {
    if (alTerminar === funcion) alTerminar = null
  }
}

// Envuelve las rutas con sesión. Login y registro no pasan por aquí:
// en esas, un 401 solo significa "correo o contraseña incorrectos".
async function conSesion(token, llamada) {
  try {
    return await llamada()
  } catch (e) {
    if (e?.status === 401 && token && alTerminar) alTerminar(e)
    throw e
  }
}

// Llamada real al backend. Si responde con error, lanza { status, error, mensaje } como dice el contrato.
// El cuerpo puede ser un objeto (se envía como JSON) o un FormData (para subir archivos, ruta 8).
async function pedir(metodo, ruta, { token, cuerpo } = {}) {
  const esArchivo = cuerpo instanceof FormData
  let respuesta
  try {
    respuesta = await fetch(BASE + ruta, {
      method: metodo,
      headers: {
        // Con FormData no se pone Content-Type: el navegador lo arma con el "boundary" correcto
        ...(cuerpo && !esArchivo ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: cuerpo ? (esArchivo ? cuerpo : JSON.stringify(cuerpo)) : undefined,
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
    // Datos extra de algunos errores, por ejemplo "faltan" en 422 columnas_faltantes (ruta 8)
    if (datos?.faltan) e.faltan = datos.faltan
    throw e
  }
  return datos
}

// ---------- RF-01 · Usuarios y acceso ----------

// 1. POST /auth/registro (sin sesión)
export const registrar = (datos) =>
  USAR_DATOS_FALSOS ? falsos.registro(datos) : pedir('POST', '/auth/registro', { cuerpo: datos })

// 2. POST /auth/login (sin sesión)
export const iniciarSesion = (datos) =>
  USAR_DATOS_FALSOS ? falsos.login(datos) : pedir('POST', '/auth/login', { cuerpo: datos })

// 3. GET /auth/yo
export const obtenerUsuarioActual = (token) =>
  conSesion(token, () => (USAR_DATOS_FALSOS ? falsos.yo(token) : pedir('GET', '/auth/yo', { token })))

// 4. GET /usuarios
export const listarUsuarios = (token) =>
  conSesion(token, () =>
    USAR_DATOS_FALSOS ? falsos.listarUsuarios(token) : pedir('GET', '/usuarios', { token }),
  )

// 5. POST /usuarios
export const crearUsuario = (token, datos) =>
  conSesion(token, () =>
    USAR_DATOS_FALSOS ? falsos.crearUsuario(token, datos) : pedir('POST', '/usuarios', { token, cuerpo: datos }),
  )

// 6. PATCH /usuarios/{id}
export const cambiarUsuario = (token, id, datos) =>
  conSesion(token, () =>
    USAR_DATOS_FALSOS
      ? falsos.cambiarUsuario(token, id, datos)
      : pedir('PATCH', `/usuarios/${id}`, { token, cuerpo: datos }),
  )

// ---------- RF-02, RF-03 y RF-04 · Carga de ventas ----------

// 7. GET /cargas/plantilla?formato=csv|xlsx (sin sesión). Devuelve el archivo (Blob) para descargarlo.
export async function descargarPlantilla(formato = 'csv') {
  if (USAR_DATOS_FALSOS) return cargasFalsas.plantilla(formato)
  let respuesta
  try {
    respuesta = await fetch(`${BASE}/cargas/plantilla?formato=${formato}`)
  } catch {
    const e = new Error('No pudimos conectarnos con el servidor. Revisa tu internet e intenta de nuevo.')
    e.status = 0
    e.error = 'sin_conexion'
    e.mensaje = e.message
    throw e
  }
  if (!respuesta.ok) {
    const e = new Error('No pudimos descargar la plantilla. Intenta de nuevo.')
    e.status = respuesta.status
    e.error = 'error_desconocido'
    e.mensaje = e.message
    throw e
  }
  return respuesta.blob()
}

// 8. POST /cargas (multipart, campo "archivo")
export function subirCarga(token, archivo) {
  return conSesion(token, () => {
    if (USAR_DATOS_FALSOS) return cargasFalsas.subir(token, archivo)
    const formulario = new FormData()
    formulario.append('archivo', archivo)
    return pedir('POST', '/cargas', { token, cuerpo: formulario })
  })
}

// 9. GET /cargas
export const listarCargas = (token) =>
  conSesion(token, () => (USAR_DATOS_FALSOS ? cargasFalsas.listar(token) : pedir('GET', '/cargas', { token })))

// 10. GET /cargas/{id}
export const verCarga = (token, id) =>
  conSesion(token, () => (USAR_DATOS_FALSOS ? cargasFalsas.ver(token, id) : pedir('GET', `/cargas/${id}`, { token })))

// 11. POST /cargas/{id}/confirmar
export const confirmarCarga = (token, id) =>
  conSesion(token, () =>
    USAR_DATOS_FALSOS ? cargasFalsas.confirmar(token, id) : pedir('POST', `/cargas/${id}/confirmar`, { token }),
  )

// 12. DELETE /cargas/{id}
export const descartarCarga = (token, id) =>
  conSesion(token, () =>
    USAR_DATOS_FALSOS ? cargasFalsas.descartar(token, id) : pedir('DELETE', `/cargas/${id}`, { token }),
  )
