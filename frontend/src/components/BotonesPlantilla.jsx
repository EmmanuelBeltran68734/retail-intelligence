import { useState } from 'react'
import { descargarPlantilla } from '../api/cliente.js'
import { guardarArchivo } from '../descargar.js'

// Botones para descargar la plantilla del Anexo B (ruta 7). Los usan P03 y P13.
export default function BotonesPlantilla({ tamano = 'sm' }) {
  const [bajando, setBajando] = useState('')
  const [error, setError] = useState('')

  async function bajar(formato) {
    setError('')
    setBajando(formato)
    try {
      const archivo = await descargarPlantilla(formato)
      guardarArchivo(archivo, `plantilla_ventas.${formato}`)
    } catch (err) {
      setError(err.mensaje)
    } finally {
      setBajando('')
    }
  }

  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="row">
        <button className={`btn alt ${tamano}`} type="button" onClick={() => bajar('xlsx')} disabled={Boolean(bajando)}>
          {bajando === 'xlsx' ? 'Descargando…' : 'Plantilla en Excel'}
        </button>
        <button className={`btn alt ${tamano}`} type="button" onClick={() => bajar('csv')} disabled={Boolean(bajando)}>
          {bajando === 'csv' ? 'Descargando…' : 'Plantilla en CSV'}
        </button>
      </div>
      {error && (
        <p className="aviso error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
