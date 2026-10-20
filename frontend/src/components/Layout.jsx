import { NavLink, Outlet } from 'react-router-dom'
import { NAV } from '../navegacion.js'
import { useSesion } from '../sesion/contexto.js'
import { USAR_DATOS_FALSOS } from '../api/cliente.js'
import Icono from './Icono.jsx'
import BotonTema from './BotonTema.jsx'
import './Layout.css'

// Marco de la aplicación: menú lateral + barra superior + contenido de cada pantalla.
// <Outlet /> es el lugar donde React Router pinta la pantalla de la ruta actual.
export default function Layout() {
  const { usuario, salir } = useSesion()
  const inicial = usuario.nombre.trim().charAt(0).toUpperCase()

  return (
    <div className="wrap">
      <div className="app">
        <aside className="side">
          <div className="awning" />
          <div className="brand">
            <i>RI</i>Retail Intelligence
          </div>

          <nav aria-label="Menú principal">
            {NAV.map((grupo) => (
              <div key={grupo.titulo}>
                <div className="nav-h">{grupo.titulo}</div>
                {grupo.opciones.map(([ruta, texto, icono]) => (
                  <NavLink key={ruta} to={ruta} className="nav">
                    <Icono nombre={icono} />
                    {texto}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>

          {/* Quién inició sesión y su tienda (ruta 3: GET /auth/yo) */}
          <div className="store">
            <div className="av">{inicial}</div>
            <div className="store-txt">
              <b>{usuario.nombre}</b>
              <small>{usuario.comercio.nombre}</small>
            </div>
          </div>
          <button type="button" className="btn-salir" onClick={salir}>
            Salir
          </button>
        </aside>

        <div className="main">
          <div className="top">
            <span className="sp" />
            {USAR_DATOS_FALSOS && <span className="chip-ex">Datos de ejemplo</span>}
            <BotonTema />
            <div className="av" title={usuario.nombre}>
              {inicial}
            </div>
          </div>
          <main className="content">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
