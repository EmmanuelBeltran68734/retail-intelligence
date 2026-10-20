import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import RequiereSesion from './sesion/RequiereSesion.jsx'
import EnConstruccion from './pages/EnConstruccion.jsx'
import Login from './pages/Login.jsx'
import MiNegocio from './pages/MiNegocio.jsx'
import { PANTALLAS } from './navegacion.js'

// Pantallas que ya están hechas. Las demás muestran "En construcción" hasta su semana.
const LISTAS = {
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
          <Route path="*" element={<EnConstruccion codigo="—" titulo="Página no encontrada" />} />
        </Route>
      </Route>
    </Routes>
  )
}
