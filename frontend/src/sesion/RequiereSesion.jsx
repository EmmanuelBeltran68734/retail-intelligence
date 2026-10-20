import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useSesion } from './contexto.js'

// Protege las pantallas: si no hay sesión, manda a P01 (inicio de sesión).
export default function RequiereSesion() {
  const { usuario, cargando } = useSesion()
  const ubicacion = useLocation()

  if (cargando) {
    return <p className="cargando">Cargando…</p>
  }
  if (!usuario) {
    // Se recuerda a dónde quería ir, para llevarla ahí después de entrar
    return <Navigate to="/login" replace state={{ desde: ubicacion.pathname }} />
  }
  return <Outlet />
}
