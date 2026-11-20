// ============================================================
// NexusTech - Lo que se guarda en el navegador (localStorage)
// Productos, categorías, órdenes y usuarios se piden al backend.
// Aquí solo quedan el carrito, el cupón, la sesión (con su token
// JWT) y los mensajes de contacto, validando su estructura.
// ============================================================

import { ROLES } from '../data/configuracion.js';
import { CLAVES, guardarJSON, leerJSON } from './storage.js';

// Conserva solo filas { id, cantidad } válidas y sin repetir.
// Los productos que ya no existen se quitan cuando llega el catálogo.
function limpiarCarrito(candidato) {
  const ids = new Set();
  return (Array.isArray(candidato) ? candidato : [])
    .filter((item) => {
      const valido =
        item &&
        Number.isInteger(item.id) &&
        !ids.has(item.id) &&
        Number.isInteger(item.cantidad) &&
        item.cantidad > 0;
      if (valido) ids.add(item.id);
      return valido;
    })
    .map((item) => ({ id: item.id, cantidad: item.cantidad }));
}

// El backend vuelve a validar el cupón al pagar; aquí solo se revisa su forma
const cuponValido = (cupon) =>
  Boolean(cupon && typeof cupon.codigo === 'string' && Number.isInteger(cupon.descuento) && cupon.descuento > 0);

export function cargarTienda() {
  const carrito = limpiarCarrito(leerJSON(CLAVES.carrito, []));
  const cupon = leerJSON(CLAVES.cupon, null);
  return { carrito, cupon: carrito.length && cuponValido(cupon) ? cupon : null };
}

export function guardarTienda({ carrito, cupon }) {
  const carritoOk = guardarJSON(CLAVES.carrito, carrito);
  const cuponOk = guardarJSON(CLAVES.cupon, cupon);
  return carritoOk && cuponOk;
}

// ---------- Sesión ----------

// La sesión guarda el token JWT y los datos del usuario, nunca la contraseña
export function crearSesion(usuario, token) {
  const { id, run, nombre, apellidos, correo, tipo, region, comuna, direccion } = usuario;
  return { token, id, run, nombre, apellidos, correo, tipo, region, comuna, direccion };
}

// El token indica hasta cuándo vale ("exp", en segundos). Uno vencido o ilegible no sirve.
export function tokenVigente(token) {
  try {
    const datos = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return datos.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

// Solo se restaura una sesión bien formada y con el token vigente
export function cargarSesion() {
  const sesion = leerJSON(CLAVES.sesion, null);
  const valida =
    sesion &&
    typeof sesion.token === 'string' &&
    Number.isInteger(sesion.id) &&
    ROLES.includes(sesion.tipo) &&
    tokenVigente(sesion.token);
  return valida ? sesion : null;
}

export const guardarSesion = (sesion) => guardarJSON(CLAVES.sesion, sesion);

// ---------- Mensajes de contacto (sin backend: quedan en el navegador) ----------

export function guardarMensaje(mensaje) {
  const mensajes = leerJSON(CLAVES.mensajes, []);
  const lista = Array.isArray(mensajes) ? mensajes : [];
  return guardarJSON(CLAVES.mensajes, [...lista, mensaje]);
}
