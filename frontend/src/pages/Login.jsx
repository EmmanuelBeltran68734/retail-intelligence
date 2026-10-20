import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useSesion } from '../sesion/contexto.js'
import { USAR_DATOS_FALSOS } from '../api/cliente.js'
import BotonTema from '../components/BotonTema.jsx'
import Icono from '../components/Icono.jsx'
import './Login.css'

const VACIO = { comercio: '', ciudad: '', nombre: '', correo: '', contrasena: '' }

// P01 · Inicio de sesión (RF-01). Usa las rutas 1 (registro) y 2 (login) del contrato.
export default function Login() {
  const { usuario, entrar, crearCuenta } = useSesion()
  const ubicacion = useLocation()
  const [modo, setModo] = useState('entrar') // 'entrar' o 'crear'
  const [campos, setCampos] = useState(VACIO)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [verClave, setVerClave] = useState(false)
  const [mayusculas, setMayusculas] = useState(false)

  // Con sesión abierta no se muestra el formulario: se lleva a la persona a donde quería ir
  if (usuario) return <Navigate to={ubicacion.state?.desde || '/inicio'} replace />

  const creando = modo === 'crear'
  const cambiar = (e) => setCampos({ ...campos, [e.target.name]: e.target.value })

  async function enviar(e) {
    e.preventDefault()
    setError('')
    setEnviando(true)
    try {
      // Al abrir la sesión, la línea "if (usuario)" de arriba lleva a la persona adentro
      if (creando) await crearCuenta(campos)
      else await entrar(campos.correo, campos.contrasena)
    } catch (err) {
      // El mensaje del backend se muestra tal cual (lo dice el contrato)
      setError(err.mensaje || 'Algo salió mal. Intenta de nuevo.')
      setEnviando(false)
    }
  }

  function elegirModo(nuevo) {
    setModo(nuevo)
    setError('')
  }

  // Avisa si la tecla Bloq Mayús está activada mientras escribe la contraseña
  const revisarMayusculas = (e) => setMayusculas(e.getModifierState?.('CapsLock') || false)

  function usarCuentaDePrueba() {
    setModo('entrar')
    setError('')
    setCampos({ ...VACIO, correo: 'marta@ejemplo.com', contrasena: 'minimo8caracteres' })
  }

  return (
    <div className="login">
      <section className="login-izq">
        <div className="awning" />
        <div className="brand login-brand">
          <i>RI</i>Retail Intelligence
        </div>
        <h1>Tus ventas, explicadas en palabras sencillas</h1>
        <p>
          Sube lo que vendiste y te contamos qué se está vendiendo más, qué se te está acabando y qué clientes
          dejaron de venir. Sin fórmulas y sin tecnicismos.
        </p>
        <blockquote className="quote">
          «La motivación nos impulsa a comenzar y el hábito nos permite continuar»
          <small>— Jim Ryun</small>
        </blockquote>
      </section>

      <section className="login-der">
        <div className="login-tema">
          <BotonTema />
        </div>

        <div className="login-caja">
          {/* Selector entre "Entrar" y "Crear cuenta" */}
          <div className={`segmento ${creando ? 'derecha' : ''}`} role="group" aria-label="Elige qué quieres hacer">
            <span className="segmento-marca" aria-hidden="true" />
            <button type="button" aria-pressed={!creando} onClick={() => elegirModo('entrar')}>
              Entrar
            </button>
            <button type="button" aria-pressed={creando} onClick={() => elegirModo('crear')}>
              Crear cuenta
            </button>
          </div>

          {/* "key" hace que el formulario aparezca con animación al cambiar de modo */}
          <form key={modo} className="login-form" onSubmit={enviar} noValidate>
            <div>
              <h1 className="login-titulo">{creando ? 'Crea la cuenta de tu tienda' : 'Hola de nuevo'}</h1>
              <p className="sub">
                {creando
                  ? 'Quedas como propietario y luego puedes agregar a tus encargados.'
                  : 'Entra para ver cómo le fue a tu tienda esta semana.'}
              </p>
            </div>

            {creando && (
              <>
                <div className="field">
                  <label htmlFor="comercio">Nombre de la tienda</label>
                  <input id="comercio" name="comercio" value={campos.comercio} onChange={cambiar} required />
                </div>
                <div className="field">
                  <label htmlFor="ciudad">Ciudad</label>
                  <input id="ciudad" name="ciudad" value={campos.ciudad} onChange={cambiar} />
                </div>
                <div className="field">
                  <label htmlFor="nombre">Tu nombre</label>
                  <input id="nombre" name="nombre" value={campos.nombre} onChange={cambiar} autoComplete="name" required />
                </div>
              </>
            )}

            <div className="field">
              <label htmlFor="correo">Correo</label>
              <input
                id="correo"
                name="correo"
                type="email"
                value={campos.correo}
                onChange={cambiar}
                autoComplete="email"
                placeholder="tucorreo@ejemplo.com"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="contrasena">Contraseña</label>
              <div className="clave">
                <input
                  id="contrasena"
                  name="contrasena"
                  type={verClave ? 'text' : 'password'}
                  value={campos.contrasena}
                  onChange={cambiar}
                  onKeyUp={revisarMayusculas}
                  onKeyDown={revisarMayusculas}
                  onBlur={() => setMayusculas(false)}
                  autoComplete={creando ? 'new-password' : 'current-password'}
                  required
                />
                <button
                  type="button"
                  className="clave-ver"
                  onClick={() => setVerClave(!verClave)}
                  aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  title={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  <Icono nombre={verClave ? 'ojoTachado' : 'ojo'} />
                </button>
              </div>
              {mayusculas && <small className="ayuda alerta">Bloq Mayús está activado.</small>}
              {creando && !mayusculas && <small className="ayuda">Mínimo 8 caracteres.</small>}
            </div>

            {error && (
              <p className="aviso error" role="alert">
                {error}
              </p>
            )}

            <button className="btn btn-accion" type="submit" disabled={enviando}>
              {enviando && <span className="girando" aria-hidden="true" />}
              {enviando ? 'Un momento…' : creando ? 'Crear mi cuenta' : 'Entrar a mi tienda'}
            </button>

            <p className="sub nota">Tus datos son de tu negocio. Solo tú y las personas que invites pueden verlos.</p>

            {USAR_DATOS_FALSOS && (
              <div className="aviso info prueba">
                <span>
                  <b>Modo de prueba.</b> Propietaria: <code>marta@ejemplo.com</code> / <code>minimo8caracteres</code>.
                  Encargado: <code>luis@ejemplo.com</code> / <code>cambiar123</code>.
                </span>
                <button type="button" className="btn sm alt" onClick={usarCuentaDePrueba}>
                  Usar cuenta de prueba
                </button>
              </div>
            )}
          </form>
        </div>
      </section>
    </div>
  )
}
