import { useEffect, useState } from 'react'
import { alTerminarSesion, iniciarSesion, obtenerUsuarioActual, registrar } from '../api/cliente.js'
import { SesionContexto } from './contexto.js'
import AvisoSesion from './AvisoSesion.jsx'

const CLAVE_TOKEN = 'token'
const MENSAJE_VENCIDA = 'Tu sesión terminó. Vuelve a entrar.'

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
  // Mensaje que se muestra en P01 cuando la sesión terminó sola (401)
  const [aviso, setAviso] = useState(null)

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

  // Si cualquier pantalla recibe un 401 con la app abierta, se cierra la sesión.
  // RequiereSesion ve que ya no hay usuario y lleva a P01 recordando la página donde estaba.
  useEffect(
    () =>
      alTerminarSesion((e) => {
        guardarToken(null)
        setToken(null)
        setUsuario(null)
        setCargando(false)
        setAviso(e?.mensaje || MENSAJE_VENCIDA)
      }),
    [],
  )

  // Solo para probar en desarrollo: en la consola del navegador escribir  __vencerSesion()
  // y luego ir a otra pantalla que llame a la API (por ejemplo, Mi negocio).
  useEffect(() => {
    if (!import.meta.env.DEV) return
    window.__vencerSesion = () => setToken('token-vencido')
    return () => {
      delete window.__vencerSesion
    }
  }, [])

  function abrirSesion({ token: nuevo, usuario: u }) {
    guardarToken(nuevo)
    setToken(nuevo)
    setUsuario(u)
    setCargando(false)
    setAviso(null)
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
      setAviso(null)
    },
  }

  return (
    <SesionContexto.Provider value={valor}>
      {children}
      {aviso && <AvisoSesion mensaje={aviso} alCerrar={() => setAviso(null)} />}
    </SesionContexto.Provider>
  )
}
