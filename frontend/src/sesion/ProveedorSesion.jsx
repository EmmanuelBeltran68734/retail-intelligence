import { useEffect, useState } from 'react'
import { iniciarSesion, obtenerUsuarioActual, registrar } from '../api/cliente.js'
import { SesionContexto } from './contexto.js'

const CLAVE_TOKEN = 'token'

function leerToken() {
  try {
    return localStorage.getItem(CLAVE_TOKEN)
  } catch {
    return null
  }
}

function guardarToken(token) {
  try {
    if (token) localStorage.setItem(CLAVE_TOKEN, token)
    else localStorage.removeItem(CLAVE_TOKEN)
  } catch {
    // si el navegador no deja guardar, la sesión dura mientras la página esté abierta
  }
}

// Maneja la sesión de toda la aplicación: token, usuario, entrar, registrarse y salir.
export default function ProveedorSesion({ children }) {
  const [token, setToken] = useState(leerToken)
  const [usuario, setUsuario] = useState(null)
  // "cargando" mientras se revisa si el token guardado sigue sirviendo (ruta 3: GET /auth/yo)
  const [cargando, setCargando] = useState(() => Boolean(leerToken()))

  useEffect(() => {
    if (!token || usuario) return
    let activo = true
    obtenerUsuarioActual(token)
      .then((u) => activo && setUsuario(u))
      .catch(() => {
        // El token venció o no sirve (401): se borra y se vuelve a P01
        if (!activo) return
        guardarToken(null)
        setToken(null)
      })
      .finally(() => activo && setCargando(false))
    return () => {
      activo = false
    }
  }, [token, usuario])

  function abrirSesion({ token: nuevo, usuario: u }) {
    guardarToken(nuevo)
    setToken(nuevo)
    setUsuario(u)
    setCargando(false)
  }

  const valor = {
    token,
    usuario,
    cargando,
    entrar: async (correo, contrasena) => abrirSesion(await iniciarSesion({ correo, contrasena })),
    crearCuenta: async (datos) => abrirSesion(await registrar(datos)),
    salir: () => {
      guardarToken(null)
      setToken(null)
      setUsuario(null)
    },
  }

  return <SesionContexto.Provider value={valor}>{children}</SesionContexto.Provider>
}
