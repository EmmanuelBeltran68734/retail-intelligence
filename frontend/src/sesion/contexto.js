import { createContext, useContext } from 'react'

// Guarda quién inició sesión, para que cualquier pantalla lo pueda leer
export const SesionContexto = createContext(null)

// Uso en una pantalla: const { usuario, salir } = useSesion()
export function useSesion() {
  return useContext(SesionContexto)
}
