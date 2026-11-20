// ============================================================
// NexusTech - Reglas fijas del negocio
// ============================================================

// Costo del despacho a domicilio. El retiro en tienda es gratis.
export const COSTO_DESPACHO = 3990;

export const OPCIONES_ENTREGA = [
  {
    valor: 'despacho',
    texto: 'Despacho a domicilio (48 horas hábiles)',
    costo: COSTO_DESPACHO,
  },
  {
    valor: 'retiro',
    texto: 'Retiro en tienda (Av. Principal 1234, Santiago)',
    costo: 0,
  },
];

// Tarjetas de prueba: las terminadas en estos dígitos son rechazadas
export const SUFIJO_TARJETA_RECHAZADA = '0000';

export const LIMITE_DESTACADOS = 8;

// Administrador: todo. Vendedor: ve productos y órdenes (lista y detalle). Cliente: solo la tienda.
export const ROLES = ['Administrador', 'Vendedor', 'Cliente'];

// Íconos de Bootstrap Icons que el administrador puede elegir
export const iconosCategoria = [
  'bi-cpu-fill',
  'bi-mouse2-fill',
  'bi-controller',
  'bi-laptop',
  'bi-headphones',
  'bi-display',
  'bi-keyboard',
  'bi-phone',
  'bi-router',
  'bi-camera',
  'bi-speaker',
  'bi-tag',
];
