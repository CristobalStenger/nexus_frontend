import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../utilidades.jsx';

// Archivo propio: useCambioDeRuta recuerda la ruta anterior a nivel de módulo y aquí parte de cero
describe('foco al cambiar de página', () => {
  it('al abrir la app no mueve el foco y al navegar lo lleva al contenido', async () => {
    const user = userEvent.setup();
    renderApp('/');
    // Así el primer Tab llega a "Saltar al contenido"
    expect(document.body).toHaveFocus();
    await user.click(within(screen.getByRole('navigation', { name: 'Navegación principal' })).getByRole('link', { name: 'Productos' }));
    expect(await screen.findByRole('heading', { name: 'Catálogo NexusTech' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveFocus();
  });
});
