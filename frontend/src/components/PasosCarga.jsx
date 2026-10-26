// Los tres pasos de la carga de ventas: 1. Elegir archivo › 2. Revisión › 3. Listo
const PASOS = ['1. Elegir archivo', '2. Revisión', '3. Listo']

export default function PasosCarga({ actual }) {
  return (
    <ol className="pasos" aria-label="Pasos para cargar tus ventas">
      {PASOS.map((texto, i) => (
        <li key={texto} aria-current={i + 1 === actual ? 'step' : undefined}>
          {texto}
        </li>
      ))}
    </ol>
  )
}
