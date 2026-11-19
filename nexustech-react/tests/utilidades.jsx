import { render } from '@testing-library/react';
import { MemoryRouter, parsePath } from 'react-router';
import App from '../src/App.jsx';
import { usuariosIniciales } from '../src/data/usuariosIniciales.js';
import { CLAVES } from '../src/services/storage.js';
import { crearSesion } from '../src/services/persistencia.js';

// La aplicación completa con un historial en memoria
export function renderApp(ruta = '/', state) {
  return render(
    <MemoryRouter initialEntries={[{ ...parsePath(ruta), state }]}>
      <App />
    </MemoryRouter>,
  );
}

// Deja guardada la sesión de uno de los usuarios de ejemplo
export function iniciarSesionComo(tipo) {
  const usuario = usuariosIniciales.find((u) => u.tipo === tipo);
  localStorage.setItem(CLAVES.sesion, JSON.stringify(crearSesion(usuario)));
  return usuario;
}

export function guardarCarrito(carrito) {
  localStorage.setItem(CLAVES.carrito, JSON.stringify(carrito));
}

export const leer = (clave) => JSON.parse(localStorage.getItem(clave));
