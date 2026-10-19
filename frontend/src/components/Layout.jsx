import { NavLink, Outlet } from 'react-router-dom'
import { NAV } from '../navegacion.js'
import Icono from './Icono.jsx'
import BotonTema from './BotonTema.jsx'
import './Layout.css'

// Marco de la aplicación: menú lateral + barra superior + contenido de cada pantalla.
// <Outlet /> es el lugar donde React Router pinta la pantalla de la ruta actual.
export default function Layout() {
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

          {/* Datos de ejemplo: en la semana 1 vienen del usuario que inició sesión */}
          <div className="store">
            <div className="av">M</div>
            <div>
              <b>Marta</b>
              <small>Tienda Doña Marta</small>
            </div>
          </div>
        </aside>

        <div className="main">
          <div className="top">
            <span className="sp" />
            <span className="chip-ex">Datos de ejemplo</span>
            <BotonTema />
            <div className="av" title="Marta">
              M
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
