import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import RequiereSesion from './sesion/RequiereSesion.jsx'
import EnConstruccion from './pages/EnConstruccion.jsx'
import Login from './pages/Login.jsx'
import MiNegocio from './pages/MiNegocio.jsx'
import CargarVentas from './pages/CargarVentas.jsx'
import RevisionCarga from './pages/RevisionCarga.jsx'
import CargaLista from './pages/CargaLista.jsx'
import GuiaPlantilla from './pages/GuiaPlantilla.jsx'
import Inicio from './pages/Inicio.jsx'
import Tablero from './pages/Tablero.jsx'
import ProductosClave from './pages/ProductosClave.jsx'
import Inventario from './pages/Inventario.jsx'
import VanJuntos from './pages/VanJuntos.jsx'
import { PANTALLAS } from './navegacion.js'

// Pantallas que ya están hechas. Las demás muestran "En construcción" hasta su semana.
const LISTAS = {
  '/inicio': <Inicio />,
  '/tablero': <Tablero />,
  '/productos-clave': <ProductosClave />,
  '/inventario': <Inventario />,
  '/van-juntos': <VanJuntos />,
  '/cargar': <CargarVentas />,
  '/guia-plantilla': <GuiaPlantilla />,
  '/mi-negocio': <MiNegocio />,
}

export default function App() {
  return (
    <Routes>
      {/* P01 va sin menú lateral */}
      <Route path="/login" element={<Login />} />

      {/* Todo lo demás necesita sesión */}
      <Route element={<RequiereSesion />}>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/inicio" replace />} />
          {PANTALLAS.map(({ ruta, texto, codigo }) => (
            <Route
              key={ruta}
              path={ruta}
              element={LISTAS[ruta] || <EnConstruccion codigo={codigo} titulo={texto} />}
            />
          ))}
          {/* P04 y P05 no están en el menú: se llega desde P03 (el menú deja marcado "Cargar ventas") */}
          <Route path="/cargar/:id" element={<RevisionCarga />} />
          <Route path="/cargar/:id/listo" element={<CargaLista />} />
          <Route path="*" element={<EnConstruccion codigo="—" titulo="Página no encontrada" />} />
        </Route>
      </Route>
    </Routes>
  )
}
