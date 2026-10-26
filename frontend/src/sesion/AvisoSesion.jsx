import './AvisoSesion.css'

// Cartel flotante que avisa que la sesión terminó (se ve encima de P01).
// Flota arriba para no mover el diseño de la pantalla de inicio de sesión.
export default function AvisoSesion({ mensaje, alCerrar }) {
  return (
    <div className="aviso-sesion" role="alert">
      <span>{mensaje}</span>
      <button type="button" className="aviso-sesion-cerrar" onClick={alCerrar} aria-label="Cerrar aviso">
        ×
      </button>
    </div>
  )
}
