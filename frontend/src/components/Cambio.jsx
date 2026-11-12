import { porcentaje } from '../formato.js'

// Etiqueta de subida o bajada frente al período anterior: flecha + palabra + color,
// para que no dependa solo del color (accesibilidad).
// Si el crecimiento llega vacío (null), no se muestra nada: ni número ni flecha. La frase del backend explica por qué
// (por ejemplo, un período cargado a medias, observación O5).
export default function Cambio({ valor }) {
  if (valor == null) return null
  if (valor === 0) return <span className="pill c">= Igual</span>
  const sube = valor > 0
  return (
    <span className={`pill ${sube ? 'good' : 'bad'}`}>
      <span aria-hidden="true">{sube ? '▲' : '▼'}</span>
      {sube ? 'Subió' : 'Bajó'} {porcentaje(Math.abs(valor))}
    </span>
  )
}
