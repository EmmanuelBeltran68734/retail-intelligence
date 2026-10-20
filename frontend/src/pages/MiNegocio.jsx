import { useEffect, useState } from 'react'
import { cambiarUsuario, crearUsuario, listarUsuarios } from '../api/cliente.js'
import { useSesion } from '../sesion/contexto.js'

// Textos que se muestran según el rol (tabla 18 del documento)
const ROLES = {
  propietario: { etiqueta: 'Propietario', clase: 'a', puede: 'Todo: ver resultados, cargar ventas y administrar a las personas.' },
  encargado: { etiqueta: 'Encargado', clase: 'c', puede: 'Solo cargar ventas. No ve clientes ni administra personas.' },
}

const VACIO = { nombre: '', correo: '', contrasena_temporal: '' }

// P14 · Mi negocio (RF-01). Usa las rutas 4, 5 y 6 del contrato. Solo para el propietario.
export default function MiNegocio() {
  const { usuario, token } = useSesion()
  const [personas, setPersonas] = useState(null)
  const [errorLista, setErrorLista] = useState('')
  const [formAbierto, setFormAbierto] = useState(false)
  const [nueva, setNueva] = useState(VACIO)
  const [errorForm, setErrorForm] = useState('')
  const [exito, setExito] = useState('')
  const [enviando, setEnviando] = useState(false)
  const esPropietario = usuario.rol === 'propietario'

  // Ruta 4: GET /usuarios
  useEffect(() => {
    if (!esPropietario) return
    let activo = true
    listarUsuarios(token)
      .then((lista) => activo && setPersonas(lista))
      .catch((err) => activo && setErrorLista(err.mensaje))
    return () => {
      activo = false
    }
  }, [token, esPropietario])

  // Ruta 5: POST /usuarios
  async function agregar(e) {
    e.preventDefault()
    setErrorForm('')
    setExito('')
    setEnviando(true)
    try {
      const creada = await crearUsuario(token, nueva)
      setPersonas([...personas, creada])
      setExito(
        `Listo. Entrégale a ${creada.nombre} su correo y la contraseña temporal; en esta versión no se envían correos.`,
      )
      setNueva(VACIO)
      setFormAbierto(false)
    } catch (err) {
      setErrorForm(err.mensaje)
    } finally {
      setEnviando(false)
    }
  }

  // Ruta 6: PATCH /usuarios/{id}
  async function cambiarAcceso(persona) {
    setExito('')
    try {
      const actualizada = await cambiarUsuario(token, persona.id, { activo: !persona.activo })
      setPersonas(personas.map((p) => (p.id === actualizada.id ? actualizada : p)))
    } catch (err) {
      setErrorLista(err.mensaje)
    }
  }

  const { comercio } = usuario

  return (
    <>
      <div>
        <h1>Mi negocio</h1>
        <p className="sub">
          {comercio.nombre}
          {comercio.ciudad ? ` · ${comercio.ciudad}` : ''}
        </p>
      </div>

      <div className="grid2">
        <section className="card">
          <div className="row between">
            <h2>Personas con acceso</h2>
            {esPropietario && !formAbierto && (
              <button className="btn sm" type="button" onClick={() => setFormAbierto(true)}>
                Agregar encargado
              </button>
            )}
          </div>

          {!esPropietario && (
            <p className="sub">Solo el propietario de la tienda puede ver y administrar a las personas con acceso.</p>
          )}

          {exito && (
            <p className="aviso exito" role="status">
              {exito}
            </p>
          )}

          {formAbierto && (
            <form className="form-invitar" onSubmit={agregar} noValidate>
              <h3>Nuevo encargado</h3>
              <div className="field">
                <label htmlFor="n-nombre">Nombre</label>
                <input
                  id="n-nombre"
                  value={nueva.nombre}
                  onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="n-correo">Correo</label>
                <input
                  id="n-correo"
                  type="email"
                  value={nueva.correo}
                  onChange={(e) => setNueva({ ...nueva, correo: e.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="n-clave">Contraseña temporal</label>
                <input
                  id="n-clave"
                  value={nueva.contrasena_temporal}
                  onChange={(e) => setNueva({ ...nueva, contrasena_temporal: e.target.value })}
                  required
                />
                <small className="ayuda">Mínimo 8 caracteres. Se la entregas tú en persona.</small>
              </div>
              {errorForm && (
                <p className="aviso error" role="alert">
                  {errorForm}
                </p>
              )}
              <div className="row">
                <button className="btn sm" type="submit" disabled={enviando}>
                  {enviando ? 'Guardando…' : 'Agregar'}
                </button>
                <button
                  className="btn sm alt"
                  type="button"
                  onClick={() => {
                    setFormAbierto(false)
                    setErrorForm('')
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {errorLista && (
            <p className="aviso error" role="alert">
              {errorLista}
            </p>
          )}

          {esPropietario && personas === null && !errorLista && <p className="sub">Cargando personas…</p>}

          {personas && (
            <div className="scroll">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Persona</th>
                    <th>Permiso</th>
                    <th>Qué puede hacer</th>
                    <th>Acceso</th>
                  </tr>
                </thead>
                <tbody>
                  {personas.map((p) => {
                    const rol = ROLES[p.rol] || ROLES.encargado
                    return (
                      <tr key={p.id} className={p.activo ? '' : 'inactivo'}>
                        <td>
                          <b>{p.nombre}</b>
                          <div className="sub sin-margen">{p.correo}</div>
                        </td>
                        <td>
                          <span className={`pill ${rol.clase}`}>{rol.etiqueta}</span>
                        </td>
                        <td>{rol.puede}</td>
                        <td>
                          {p.id === usuario.id ? (
                            <span className="sub sin-margen">Tú</span>
                          ) : (
                            <button className="btn sm alt" type="button" onClick={() => cambiarAcceso(p)}>
                              {p.activo ? 'Desactivar' : 'Activar'}
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="stack">
          <section className="card">
            <h2>Tus datos</h2>
            <p className="sub">
              Son de tu negocio. Puedes descargarlos o borrarlos cuando quieras. No pedimos nombres ni cédulas de tus
              clientes (Ley 1581 de 2012).
            </p>
          </section>
          <section className="card">
            <h2>Tu cuenta</h2>
            <p className="sub">
              Entraste como <b>{usuario.nombre}</b> ({ROLES[usuario.rol]?.etiqueta.toLowerCase() || usuario.rol}).
            </p>
          </section>
        </div>
      </div>
    </>
  )
}
