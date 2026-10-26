// Cómo se muestra cada estado de una carga (tabla 18 del documento).
export const ESTADOS = {
  recibida: { texto: 'Lista para guardar', clase: 'warn' },
  con_errores: { texto: 'Con filas por revisar', clase: 'warn' },
  validada: { texto: 'Guardada', clase: 'good' },
  rechazada: { texto: 'Descartada', clase: 'c' },
}

// ¿Se puede volver a P04 para guardarla o descartarla?
export const pendiente = (carga) => carga.estado === 'recibida' || carga.estado === 'con_errores'
