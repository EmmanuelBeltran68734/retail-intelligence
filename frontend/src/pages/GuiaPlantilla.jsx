import { Link } from 'react-router-dom'
import BotonesPlantilla from '../components/BotonesPlantilla.jsx'
import { COLUMNAS } from '../plantilla.js'
import './Carga.css'

// P13 · Guía de la plantilla (RF-02, HU-03). La plantilla se descarga con la ruta 7 (no necesita sesión).
export default function GuiaPlantilla() {
  return (
    <>
      <div>
        <h1>Cómo llenar la plantilla</h1>
        <p className="sub">
          Una fila por cada producto vendido. Si en una compra se llevaron tres cosas, son tres filas con el mismo número de
          ticket y la misma fecha.
        </p>
      </div>

      <div className="grid2">
        <div className="stack">
          <section className="card">
            <div className="row between">
              <h2>Las columnas</h2>
              <BotonesPlantilla />
            </div>
            <div className="scroll">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Columna</th>
                    <th>Ejemplo</th>
                    <th>¿Obligatoria?</th>
                    <th>Qué va</th>
                    <th>Para qué sirve</th>
                  </tr>
                </thead>
                <tbody>
                  {COLUMNAS.map((c) => (
                    <tr key={c.nombre}>
                      <td>
                        <code className="columna">{c.nombre}</code>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>{c.ejemplo}</td>
                      <td>{c.obligatoria ? <span className="pill a">Sí</span> : <span className="pill c">No</span>}</td>
                      <td>{c.tipo}</td>
                      <td>{c.sirve}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card">
            <h2>Lo que revisamos en cada fila</h2>
            <ul className="sub lista">
              <li>Que no falte ninguna columna obligatoria. Si falta una, el archivo no se puede leer.</li>
              <li>
                Que la fecha exista. Sirve <b>2026-09-14</b> o <b>14/09/2026</b>; una fecha como 31/02/2026 se marca como
                error.
              </li>
              <li>
                Que la cantidad y el precio sean números mayores que 0. Se aceptan <b>$3.200</b>, <b>3200</b> o <b>3,5</b>.
              </li>
              <li>Que el descuento no sea negativo.</li>
              <li>
                Que el medio de pago sea efectivo, tarjeta, transferencia o crédito. Si escribes <b>fiado</b>, lo tomamos como
                crédito.
              </li>
              <li>Que no haya filas repetidas, exactamente iguales.</li>
            </ul>
            <p className="sub sin-margen">
              Antes de guardar te mostramos qué filas tienen problemas y cómo arreglarlas. Tú decides si guardas las buenas.
            </p>
          </section>
        </div>

        <div className="stack">
          <section className="card tip">
            <h2>Si llevas cuaderno</h2>
            <p className="sub sin-margen">
              Puedes pasarlo a Excel una vez por semana. Con fecha, producto, cantidad y precio ya ves tu resumen.
            </p>
          </section>
          <section className="card">
            <h2>Si no anotas al cliente</h2>
            <p className="sub sin-margen">
              Deja esa columna vacía. Igual verás el tablero y los productos clave; solo no aparecerán los grupos de clientes.
              Si lo anotas, usa un código como C-014: nunca el nombre ni la cédula.
            </p>
          </section>
          <section className="card">
            <h2>Cuánto historial hace falta</h2>
            <p className="sub sin-margen">Con 6 meses de ventas se activan las tendencias y los productos clave.</p>
          </section>
          <section className="card">
            <h2>Formatos que sirven</h2>
            <p className="sub sin-margen">
              CSV (separado por comas o por punto y coma) o Excel .xlsx, de máximo 5 MB. Si tienes un Excel antiguo (.xls),
              ábrelo y guárdalo como .xlsx. Las columnas de más no estorban: simplemente no las usamos.
            </p>
          </section>
          <Link className="btn" to="/cargar" style={{ justifySelf: 'start' }}>
            Ir a cargar mis ventas
          </Link>
        </div>
      </div>
    </>
  )
}
