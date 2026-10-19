import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import EnConstruccion from './pages/EnConstruccion.jsx'
import { PANTALLAS } from './navegacion.js'

// Rutas de la aplicación.
// Por ahora todas muestran "En construcción"; cada semana se cambia por la pantalla real.
export default function App() {
  return (
    <Routes>
      {/* P01 va sin menú lateral*/}
      <Route path="/login" element={<EnConstruccion codigo="P01" titulo="Inicio de sesión" />} />

      <Route element={<Layout />}>
        <Route index element={<Navigate to="/inicio" replace />} />
        {PANTALLAS.map(({ ruta, texto, codigo }) => (
          <Route key={ruta} path={ruta} element={<EnConstruccion codigo={codigo} titulo={texto} />} />
        ))}
        <Route path="*" element={<EnConstruccion codigo="—" titulo="Página no encontrada" />} />
      </Route>
    </Routes>
  )
}
