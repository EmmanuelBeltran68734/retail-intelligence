// Datos falsos que imitan al backend de Emmanuel (docs/api-contrato.md).
// Las rutas de carga de ventas (7 a 12) están en cargasFalsas.js y usan las ayudas que se exportan aquí.
// Mientras las rutas reales no existan, las pantallas leen de aquí.
// Las respuestas y los errores tienen EXACTAMENTE la misma forma que el contrato.

const CLAVE = 'datos_falsos_v1'

const INICIAL = {
  siguienteId: 3,
  comercio: { id: 1, nombre: 'Tienda Doña Marta', ciudad: 'Cartagena' },
  usuarios: [
    { id: 1, nombre: 'Marta Pérez', correo: 'marta@ejemplo.com', rol: 'propietario', activo: true, contrasena: 'minimo8caracteres' },
    { id: 2, nombre: 'Luis Gómez', correo: 'luis@ejemplo.com', rol: 'encargado', activo: true, contrasena: 'cambiar123' },
  ],
}

// Se guardan en el navegador para que no se pierdan al recargar la página
export function leer() {
  try {
    const guardado = localStorage.getItem(CLAVE)
    if (guardado) return JSON.parse(guardado)
  } catch {
    // si no se puede leer, se usan los datos iniciales
  }
  return structuredClone(INICIAL)
}

export function guardar(db) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(db))
  } catch {
    // si no se puede guardar, los cambios duran mientras la página esté abierta
  }
}

// Imita un error del backend: { status, error, mensaje }
export function fallo(status, error, mensaje) {
  const e = new Error(mensaje)
  e.status = status
  e.error = error
  e.mensaje = mensaje
  return e
}

// Imita el tiempo que tarda el servidor en responder
export const esperar = () => new Promise((r) => setTimeout(r, 350))

// Lo que el backend devuelve de un usuario (nunca la contraseña)
function publico(u) {
  return { id: u.id, nombre: u.nombre, correo: u.correo, rol: u.rol, activo: u.activo }
}

function conComercio(db, u) {
  return { id: u.id, nombre: u.nombre, correo: u.correo, rol: u.rol, comercio: { ...db.comercio } }
}

// El token falso solo guarda el id del usuario
const crearToken = (u) => `token-falso.${u.id}`

export function usuarioDelToken(db, token) {
  const id = Number(String(token || '').split('.')[1])
  const u = db.usuarios.find((x) => x.id === id)
  if (!u) throw fallo(401, 'sin_sesion', 'Tu sesión terminó. Vuelve a entrar.')
  return u
}

function soloPropietario(u) {
  if (u.rol !== 'propietario') throw fallo(403, 'sin_permiso', 'Solo el propietario puede hacer esto.')
}

const correoValido = (c) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c || '')

// ---------- Rutas (mismo número que en el contrato) ----------

// 1. POST /auth/registro
export async function registro({ comercio, ciudad, nombre, correo, contrasena }) {
  await esperar()
  const db = leer()
  if (!comercio || !nombre || !correoValido(correo)) {
    throw fallo(400, 'datos_invalidos', 'Revisa que todos los campos estén completos y el correo sea válido.')
  }
  if ((contrasena || '').length < 8) {
    throw fallo(400, 'contrasena_corta', 'La contraseña debe tener al menos 8 caracteres.')
  }
  if (db.usuarios.some((u) => u.correo.toLowerCase() === correo.toLowerCase())) {
    throw fallo(409, 'correo_registrado', 'Ya existe una cuenta con ese correo.')
  }
  // En los datos falsos hay un solo comercio: el registro lo reemplaza
  db.comercio = { id: 1, nombre: comercio, ciudad: ciudad || '' }
  const nuevo = { id: db.siguienteId++, nombre, correo, rol: 'propietario', activo: true, contrasena }
  db.usuarios.push(nuevo)
  guardar(db)
  return { token: crearToken(nuevo), usuario: conComercio(db, nuevo) }
}

// 2. POST /auth/login
export async function login({ correo, contrasena }) {
  await esperar()
  const db = leer()
  const u = db.usuarios.find((x) => x.correo.toLowerCase() === (correo || '').toLowerCase())
  if (!u || u.contrasena !== contrasena) {
    throw fallo(401, 'credenciales_invalidas', 'El correo o la contraseña no son correctos.')
  }
  if (!u.activo) {
    throw fallo(403, 'usuario_inactivo', 'Tu acceso está desactivado. Habla con el propietario de la tienda.')
  }
  return { token: crearToken(u), usuario: conComercio(db, u) }
}

// 3. GET /auth/yo
export async function yo(token) {
  await esperar()
  const db = leer()
  return conComercio(db, usuarioDelToken(db, token))
}

// 4. GET /usuarios
export async function listarUsuarios(token) {
  await esperar()
  const db = leer()
  soloPropietario(usuarioDelToken(db, token))
  return db.usuarios.map(publico)
}

// 5. POST /usuarios
export async function crearUsuario(token, { nombre, correo, contrasena_temporal }) {
  await esperar()
  const db = leer()
  soloPropietario(usuarioDelToken(db, token))
  if (!nombre || !correoValido(correo)) {
    throw fallo(400, 'datos_invalidos', 'Escribe el nombre y un correo válido.')
  }
  if ((contrasena_temporal || '').length < 8) {
    throw fallo(400, 'contrasena_corta', 'La contraseña temporal debe tener al menos 8 caracteres.')
  }
  if (db.usuarios.some((u) => u.correo.toLowerCase() === correo.toLowerCase())) {
    throw fallo(409, 'correo_registrado', 'Ya existe una cuenta con ese correo.')
  }
  const nuevo = { id: db.siguienteId++, nombre, correo, rol: 'encargado', activo: true, contrasena: contrasena_temporal }
  db.usuarios.push(nuevo)
  guardar(db)
  return publico(nuevo)
}

// 6. PATCH /usuarios/{id}
export async function cambiarUsuario(token, id, { activo }) {
  await esperar()
  const db = leer()
  const yoMismo = usuarioDelToken(db, token)
  soloPropietario(yoMismo)
  const u = db.usuarios.find((x) => x.id === id)
  if (!u) throw fallo(404, 'no_encontrado', 'Esa persona no existe.')
  if (u.id === yoMismo.id) throw fallo(400, 'no_permitido', 'No puedes desactivar tu propia cuenta.')
  u.activo = Boolean(activo)
  guardar(db)
  return publico(u)
}

// Vuelve a los datos iniciales (útil para pruebas)
export function reiniciarDatosFalsos() {
  try {
    localStorage.removeItem(CLAVE)
  } catch {
    // nada que hacer
  }
}
