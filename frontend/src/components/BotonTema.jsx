import { useState } from 'react'
import Icono from './Icono.jsx'

// Tema que se ve ahora: el que eligió la persona o, si no ha elegido, el del computador o celular.
function temaActual() {
  const elegido = document.documentElement.dataset.theme
  if (elegido === 'light' || elegido === 'dark') return elegido
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

// Botón para cambiar entre modo claro y modo oscuro.
// La elección se guarda en el navegador para la próxima vez (ver el script de index.html).
export default function BotonTema() {
  const [tema, setTema] = useState(temaActual)

  function cambiar() {
    const nuevo = tema === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = nuevo
    try {
      localStorage.setItem('tema', nuevo)
    } catch {
      // Si el navegador no deja guardar, el cambio igual funciona mientras la página esté abierta
    }
    setTema(nuevo)
  }

  const oscuro = tema === 'dark'
  return (
    <button
      type="button"
      className="btn-tema"
      onClick={cambiar}
      aria-label={oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      title={oscuro ? 'Modo claro' : 'Modo oscuro'}
    >
      <Icono nombre={oscuro ? 'sol' : 'luna'} />
    </button>
  )
}
