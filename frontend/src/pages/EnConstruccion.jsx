// Pantalla provisional: se reemplaza por la pantalla real en la semana que le toca.
export default function EnConstruccion({ codigo, titulo }) {
  return (
    <>
      <div>
        <h1>{titulo}</h1>
        <p className="sub">
          {codigo} · Esta pantalla todavía está en construcción. Mientras tanto, se puede ver en el
          prototipo.
        </p>
      </div>
      <div className="card">Aquí irá el contenido de {codigo}.</div>
    </>
  )
}
