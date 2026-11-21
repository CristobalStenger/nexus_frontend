import { describe, expect, it, vi } from 'vitest';
import { CLAVES, guardarJSON, leerJSON } from '../../src/services/storage.js';
import {
  cargarSesion,
  cargarTienda,
  crearSesion,
  guardarMensaje,
  guardarSesion,
  guardarTienda,
  tokenVigente,
} from '../../src/services/persistencia.js';

// JWT de prueba que vence en "segundos" (el frontend solo lee "exp")
const token = (segundos) =>
  `x.${btoa(JSON.stringify({ sub: '1', exp: Math.floor(Date.now() / 1000) + segundos }))}.firma`;
const usuario = {
  id: 1,
  run: '190110222',
  nombre: 'Admin',
  apellidos: 'NexusTech',
  correo: 'admin@duoc.cl',
  clave: 'admin123',
  tipo: 'Administrador',
  region: 'Región Metropolitana',
  comuna: 'Santiago',
  direccion: 'Av. Principal 1234',
};

describe('almacenamiento seguro', () => {
  it('lee la alternativa si la clave no existe o el JSON está corrupto', () => {
    expect(leerJSON('NO_EXISTE', 'x')).toBe('x');
    localStorage.setItem('ROTO', '{invalido');
    expect(leerJSON('ROTO', [])).toEqual([]);
  });

  it('guarda, borra con null e informa si el navegador rechaza la escritura', () => {
    expect(guardarJSON('CLAVE', { a: 1 })).toBe(true);
    expect(leerJSON('CLAVE')).toEqual({ a: 1 });
    expect(guardarJSON('CLAVE', null)).toBe(true);
    expect(localStorage.getItem('CLAVE')).toBeNull();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Sin espacio');
    });
    expect(guardarJSON('CLAVE', 1)).toBe(false);
  });
});

describe('carrito y cupón (lo único de la tienda que queda en el navegador)', () => {
  it('guarda y recupera el carrito con su cupón', () => {
    expect(guardarTienda({ carrito: [{ id: 1, cantidad: 2 }], cupon: { codigo: 'FELIZ18', descuento: 10 } })).toBe(true);
    expect(cargarTienda()).toEqual({ carrito: [{ id: 1, cantidad: 2 }], cupon: { codigo: 'FELIZ18', descuento: 10 } });
  });

  it('limpia cantidades inválidas, filas repetidas y cupones mal formados', () => {
    localStorage.setItem(
      CLAVES.carrito,
      JSON.stringify([{ id: 1, cantidad: 2 }, { id: 1, cantidad: 2 }, { id: 'x', cantidad: 1 }, { id: 2, cantidad: -1 }]),
    );
    localStorage.setItem(CLAVES.cupon, JSON.stringify({ codigo: 'FALSO', descuento: 'mucho' }));
    expect(cargarTienda()).toEqual({ carrito: [{ id: 1, cantidad: 2 }], cupon: null });
    localStorage.setItem(CLAVES.carrito, '"incorrecto"');
    expect(cargarTienda().carrito).toEqual([]);
  });

  it('sin productos en el carrito no conserva el cupón', () => {
    localStorage.setItem(CLAVES.cupon, JSON.stringify({ codigo: 'FELIZ18', descuento: 10 }));
    expect(cargarTienda().cupon).toBeNull();
  });
});

describe('sesión con token JWT', () => {
  it('la sesión guarda el token y nunca la contraseña', () => {
    const sesion = crearSesion(usuario, 'abc');
    expect(sesion).toMatchObject({ id: 1, token: 'abc', tipo: 'Administrador' });
    expect(sesion).not.toHaveProperty('clave');
  });

  it('sabe si un token sigue vigente', () => {
    expect(tokenVigente(token(60))).toBe(true);
    expect(tokenVigente(token(-60))).toBe(false);
    expect(tokenVigente('no-es-un-jwt')).toBe(false);
  });

  it('solo restaura una sesión bien formada y con el token vigente', () => {
    guardarSesion(crearSesion(usuario, token(60)));
    expect(cargarSesion()?.correo).toBe('admin@duoc.cl');
    guardarSesion(crearSesion(usuario, token(-60)));
    expect(cargarSesion()).toBeNull();
    guardarSesion({ ...crearSesion(usuario, token(60)), tipo: 'Jefe' });
    expect(cargarSesion()).toBeNull();
    guardarSesion(null);
    expect(localStorage.getItem(CLAVES.sesion)).toBeNull();
  });
});

describe('mensajes de contacto', () => {
  it('acumula los mensajes en el navegador', () => {
    guardarMensaje({ nombre: 'Ana' });
    guardarMensaje({ nombre: 'Luis' });
    expect(leerJSON(CLAVES.mensajes)).toHaveLength(2);
  });
});
