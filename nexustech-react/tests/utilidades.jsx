import { afterEach, beforeEach, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, parsePath } from 'react-router';
import App from '../src/App.jsx';
import { CLAVES } from '../src/services/storage.js';
import { crearSesion } from '../src/services/persistencia.js';
import { crearServidorFalso, tokenFalso } from './servidorFalso.js';

// Cada prueba parte con un servidor falso nuevo, con los datos iniciales del backend
let servidor;
beforeEach(() => {
  servidor = crearServidorFalso();
  vi.stubGlobal('fetch', servidor.fetch);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

// Lo que en la aplicación real queda guardado en PostgreSQL
export const db = () => servidor.db;

// Cuerpo JSON de la última llamada a una ruta (para revisar qué envió el frontend)
export function ultimoEnvio(metodo, ruta) {
  const llamada = servidor.fetch.mock.calls.findLast(
    ([url, opciones]) => url.endsWith(`/api/v1${ruta}`) && opciones?.method === metodo,
  );
  return llamada && JSON.parse(llamada[1].body);
}

export const esperarCarga = () =>
  waitFor(() => expect(screen.queryByText('Conectando con NexusTech…')).not.toBeInTheDocument());

// La aplicación completa con un historial en memoria, ya cargados los datos del backend
export async function renderApp(ruta = '/', state) {
  const vista = render(
    <MemoryRouter initialEntries={[{ ...parsePath(ruta), state }]}>
      <App />
    </MemoryRouter>,
  );
  await esperarCarga();
  return vista;
}

// Deja guardada la sesión (con su token) de uno de los usuarios de ejemplo.
// segundos < 0 crea un token ya vencido.
export function iniciarSesionComo(tipo, segundos) {
  const usuario = db().usuarios.find((u) => u.tipo === tipo);
  localStorage.setItem(CLAVES.sesion, JSON.stringify(crearSesion(usuario, tokenFalso(usuario, segundos))));
  return usuario;
}

export function guardarCarrito(carrito) {
  localStorage.setItem(CLAVES.carrito, JSON.stringify(carrito));
}

export const leer = (clave) => JSON.parse(localStorage.getItem(clave));
