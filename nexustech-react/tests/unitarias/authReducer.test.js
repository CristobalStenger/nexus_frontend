import { describe, expect, it } from 'vitest';
import { authReducer, crearEstadoAuth, esAdministrador, puedeVerPanel } from '../../src/store/authReducer.js';

const admin = { id: 1, run: '190110222', nombre: 'Admin', correo: 'admin@duoc.cl', tipo: 'Administrador' };
const pedro = { id: 3, run: '21456789K', nombre: 'Pedro', correo: 'cliente@gmail.com', tipo: 'Cliente' };
const sesionAdmin = { ...admin, token: 'jwt-admin' };

const conUsuarios = (sesion = sesionAdmin) =>
  authReducer(crearEstadoAuth(sesion), { type: 'USUARIOS', usuarios: [admin, pedro] });

describe('sesión y roles', () => {
  it('guarda la sesión que entrega el backend y la cierra', () => {
    const conSesion = authReducer(crearEstadoAuth(), { type: 'INGRESAR', sesion: sesionAdmin });
    expect(conSesion.sesion.token).toBe('jwt-admin');
    expect(conSesion.aviso.texto).toBe('Hola de nuevo, Admin.');
    const cerrada = authReducer(conUsuarios(), { type: 'SALIR' });
    expect(cerrada.sesion).toBeNull();
    // La lista de usuarios no queda en memoria para la próxima persona
    expect(cerrada.usuarios).toEqual([]);
    expect(cerrada.usuariosListos).toBe(false);
  });

  it('una sesión vencida se cierra con su propio aviso', () => {
    const vencida = authReducer(conUsuarios(), { type: 'EXPIRADA' });
    expect(vencida.sesion).toBeNull();
    expect(vencida.aviso).toMatchObject({ texto: 'Tu sesión expiró. Inicia sesión nuevamente.', tipo: 'warning' });
  });

  it('distingue los permisos de cada rol', () => {
    expect(puedeVerPanel({ tipo: 'Vendedor' })).toBe(true);
    expect(puedeVerPanel({ tipo: 'Cliente' })).toBe(false);
    expect(esAdministrador({ tipo: 'Vendedor' })).toBe(false);
    expect(puedeVerPanel(null)).toBe(false);
  });
});

describe('usuarios que responde el backend', () => {
  it('carga la lista y marca que ya está lista', () => {
    const estado = conUsuarios();
    expect(estado.usuarios).toHaveLength(2);
    expect(estado.usuariosListos).toBe(true);
  });

  it('agrega un usuario nuevo y actualiza uno existente por id', () => {
    const lucia = { id: 4, run: '111111111', nombre: 'Lucía', tipo: 'Vendedor' };
    const creado = authReducer(conUsuarios(), { type: 'USUARIO_GUARDADO', usuario: lucia, nuevo: true });
    expect(creado.usuarios).toHaveLength(3);
    expect(creado.aviso.texto).toBe('Usuario "Lucía" creado.');
    const editado = authReducer(creado, { type: 'USUARIO_GUARDADO', usuario: { ...lucia, nombre: 'Lucía Andrea' }, nuevo: false });
    expect(editado.usuarios[2].nombre).toBe('Lucía Andrea');
    expect(editado.usuarios).toHaveLength(3);
  });

  it('al editar la cuenta propia actualiza la sesión y conserva el token', () => {
    const estado = authReducer(conUsuarios(), {
      type: 'USUARIO_GUARDADO',
      usuario: { ...admin, nombre: 'Administradora' },
      nuevo: false,
    });
    expect(estado.sesion).toMatchObject({ nombre: 'Administradora', token: 'jwt-admin' });
  });

  it('elimina usuarios por id', () => {
    const estado = authReducer(conUsuarios(), { type: 'USUARIO_ELIMINADO', id: 3 });
    expect(estado.usuarios).toEqual([admin]);
    expect(estado.aviso).toMatchObject({ texto: 'Usuario "Pedro" eliminado.', tipo: 'info' });
  });

  it('muestra y cierra avisos, e ignora acciones desconocidas', () => {
    const conAviso = authReducer(crearEstadoAuth(), { type: 'AVISO', texto: 'Error', tipo: 'danger' });
    expect(conAviso.aviso).toMatchObject({ texto: 'Error', tipo: 'danger' });
    expect(authReducer(conAviso, { type: 'CERRAR_AVISO' }).aviso).toBeNull();
    expect(authReducer(conAviso, { type: 'OTRA' })).toBe(conAviso);
  });
});
