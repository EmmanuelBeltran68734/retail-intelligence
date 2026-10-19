// Menú lateral, igual al del prototipo.
// Cada opción: [ruta, texto, ícono, código de pantalla]
export const NAV = [
  {
    titulo: 'Tu tienda',
    opciones: [
      ['/inicio', 'Inicio', 'home', 'P02'],
      ['/tablero', 'Tablero', 'chart', 'P06'],
      ['/productos-clave', 'Productos clave', 'star', 'P07'],
      ['/hallazgos', 'Hallazgos', 'bulb', 'P08'],
    ],
  },
  {
    titulo: 'Entender más',
    opciones: [
      ['/clientes', 'Clientes', 'people', 'P10'],
      ['/van-juntos', 'Van juntos', 'link', 'P11'],
      ['/preguntar', 'Preguntar', 'ask', 'P12'],
    ],
  },
  {
    titulo: 'Tus datos',
    opciones: [
      ['/cargar', 'Cargar ventas', 'up', 'P03'],
      ['/guia-plantilla', 'Guía de la plantilla', 'book', 'P13'],
      ['/mi-negocio', 'Mi negocio', 'shop', 'P14'],
    ],
  },
]

// Lista plana de todas las pantallas del menú (la usa App.jsx para crear las rutas)
export const PANTALLAS = NAV.flatMap((grupo) =>
  grupo.opciones.map(([ruta, texto, , codigo]) => ({ ruta, texto, codigo })),
)
