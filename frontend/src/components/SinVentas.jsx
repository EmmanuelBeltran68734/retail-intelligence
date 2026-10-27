import { Link } from 'react-router-dom'

// Lo que ven P02 y P06 cuando la tienda todavía no tiene ventas guardadas ("sin_datos" en el contrato)
export default function SinVentas() {
  return (
    <section className="card tip">
      <h2>Todavía no tenemos ventas tuyas</h2>
      <p className="sub sin-margen">
        Sube tu primer archivo de ventas y aquí verás cuánto vendiste, qué se vende más y qué días te va mejor. Con 6 meses
        de historial se ve mucho mejor.
      </p>
      <div className="row">
        <Link className="btn sm" to="/cargar">
          Cargar mis ventas
        </Link>
        <Link className="btn alt sm" to="/guia-plantilla">
          Cómo llenar la plantilla
        </Link>
      </div>
    </section>
  )
}
