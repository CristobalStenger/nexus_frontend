// ============================================================
// NexusTech - Reducer de usuarios y sesión
// Estado: { sesion, usuarios, usuariosListos, aviso }
// La sesión incluye el token JWT que entrega el backend al iniciar
// sesión. La lista de usuarios solo se carga para el administrador.
// Roles: Administrador (todo), Vendedor (productos y órdenes, solo
// lectura) y Cliente (solo la tienda).
// ============================================================

import { actualizar, crear, eliminar, obtener } from '../services/crud.js';
import { conAviso } from './aviso.js';
import { crearSesion } from '../services/persistencia.js';

export const ROLES_PANEL = ['Administrador', 'Vendedor'];

export const puedeVerPanel = (sesion) => ROLES_PANEL.includes(sesion?.tipo);
export const esAdministrador = (sesion) => sesion?.tipo === 'Administrador';

export function crearEstadoAuth(sesion = null) {
  return { sesion, usuarios: [], usuariosListos: false, aviso: null };
}

// Al salir se borra todo lo de la sesión anterior (incluida la lista de usuarios)
const sinSesion = (estado, texto, tipo) => conAviso({ ...crearEstadoAuth(), aviso: estado.aviso }, texto, tipo);

function usuarioGuardado(estado, { usuario, nuevo }) {
  const usuarios = nuevo
    ? crear(estado.usuarios, usuario)
    : actualizar(estado.usuarios, usuario.id, usuario);
  // Si la persona editó su propia cuenta se actualiza la sesión abierta (conserva el token)
  const sesion =
    estado.sesion?.id === usuario.id ? crearSesion(usuario, estado.sesion.token) : estado.sesion;
  return conAviso(
    { ...estado, usuarios, sesion },
    `Usuario "${usuario.nombre}" ${nuevo ? 'creado' : 'actualizado'}.`,
  );
}

export function authReducer(estado, accion) {
  switch (accion.type) {
    case 'INGRESAR':
      return conAviso({ ...estado, sesion: accion.sesion }, `Hola de nuevo, ${accion.sesion.nombre}.`);
    case 'SALIR':
      return sinSesion(estado, 'Sesión cerrada. ¡Hasta pronto!', 'info');
    case 'EXPIRADA':
      return sinSesion(estado, 'Tu sesión expiró. Inicia sesión nuevamente.', 'warning');
    case 'USUARIOS':
      return { ...estado, usuarios: accion.usuarios, usuariosListos: true };
    case 'USUARIO_GUARDADO':
      return usuarioGuardado(estado, accion);
    case 'USUARIO_ELIMINADO':
      return conAviso(
        { ...estado, usuarios: eliminar(estado.usuarios, accion.id) },
        `Usuario "${obtener(estado.usuarios, accion.id)?.nombre}" eliminado.`,
        'info',
      );
    case 'AVISO':
      return conAviso(estado, accion.texto, accion.tipo);
    case 'CERRAR_AVISO':
      return { ...estado, aviso: null };
    default:
      return estado;
  }
}
