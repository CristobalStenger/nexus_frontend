import { describe, expect, it } from 'vitest';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CLAVES } from '../../src/services/storage.js';
import { db, guardarCarrito, iniciarSesionComo, leer, renderApp, ultimoEnvio } from '../utilidades.jsx';

async function completarCheckout(user, tarjeta = '4242 4242 4242 4242') {
  await user.type(screen.getByLabelText('Nombre'), 'Pedro');
  await user.type(screen.getByLabelText('Apellidos'), 'Hacker');
  await user.type(screen.getByLabelText('Correo'), 'pedro@gmail.com');
  await user.type(screen.getByLabelText('Calle'), 'Los Crisantemos 123');
  await user.selectOptions(screen.getByLabelText('Región'), 'Región Metropolitana');
  await user.selectOptions(screen.getByLabelText('Comuna'), 'Cerrillos');
  await completarTarjeta(user, tarjeta);
}

async function completarTarjeta(user, tarjeta) {
  await user.type(screen.getByLabelText('Número de tarjeta'), tarjeta);
  await user.type(screen.getByLabelText('Titular'), 'Pedro Hacker');
  await user.type(screen.getByLabelText('Vencimiento'), '12/30');
  await user.type(screen.getByLabelText('CVV'), '123');
}

// Stock guardado en el backend (servidor falso)
const stockDe = (id) => db().productos.find((p) => p.id === id).stock;

describe('carrito', () => {
  it('agrega desde el catálogo, cambia cantidades y elimina productos', async () => {
    const user = userEvent.setup();
    await renderApp('/productos');
    await user.click(screen.getByRole('button', { name: 'Agregar AMD Ryzen 5 7600X al carrito' }));
    expect(await screen.findByText('AMD Ryzen 5 7600X agregado al carrito.')).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Carrito (1)' }));
    await user.click(screen.getByRole('button', { name: 'Agregar una unidad de AMD Ryzen 5 7600X' }));
    expect(screen.getByLabelText('Cantidad de AMD Ryzen 5 7600X')).toHaveTextContent('2');
    expect(screen.getByRole('link', { name: 'Carrito (2)' })).toHaveTextContent('$499.980');
    await user.click(screen.getByRole('button', { name: 'Quitar una unidad de AMD Ryzen 5 7600X' }));
    expect(screen.getByLabelText('Cantidad de AMD Ryzen 5 7600X')).toHaveTextContent('1');
    await user.click(screen.getByRole('button', { name: 'Eliminar AMD Ryzen 5 7600X' }));
    expect(screen.getByText('Tu carrito está vacío.')).toBeInTheDocument();
  });

  it('conserva el carrito al desmontar y volver a montar la aplicación', async () => {
    const user = userEvent.setup();
    const vista = await renderApp('/productos');
    await user.click(screen.getByRole('button', { name: 'Agregar Razer DeathAdder V3 al carrito' }));
    vista.unmount();
    await renderApp('/carrito');
    expect(screen.getByLabelText('Cantidad de Razer DeathAdder V3')).toHaveTextContent('1');
  });

  it('descarta del carrito guardado los productos que ya no existen en el backend', async () => {
    guardarCarrito([{ id: 1, cantidad: 1 }, { id: 999, cantidad: 1 }]);
    await renderApp('/carrito');
    expect(screen.getByLabelText('Cantidad de AMD Ryzen 5 7600X')).toBeInTheDocument();
    expect(leer(CLAVES.carrito)).toEqual([{ id: 1, cantidad: 1 }]);
  });

  it('valida los cupones en el backend y permite quitarlos', async () => {
    guardarCarrito([{ id: 1, cantidad: 1 }]);
    const user = userEvent.setup();
    await renderApp('/carrito');
    await user.type(screen.getByLabelText('¿Tienes un cupón?'), 'NOEXISTE');
    await user.click(screen.getByRole('button', { name: 'Aplicar' }));
    expect(await screen.findByText('El cupón "NOEXISTE" no existe.')).toBeInTheDocument();
    await user.clear(screen.getByLabelText('¿Tienes un cupón?'));
    await user.type(screen.getByLabelText('¿Tienes un cupón?'), 'cuturrufo70');
    await user.click(screen.getByRole('button', { name: 'Aplicar' }));
    expect(await screen.findByText('Cupón CUTURRUFO70 aplicado: 25% de descuento.')).toBeInTheDocument();
    expect(screen.getByText('-$62.498')).toBeInTheDocument();
    expect(leer(CLAVES.cupon).codigo).toBe('CUTURRUFO70');
    await user.click(screen.getByRole('button', { name: 'Quitar cupón' }));
    expect(screen.queryByText('-$62.498')).not.toBeInTheDocument();
  });

  it('vacía el carrito solo después de confirmar en el modal', async () => {
    guardarCarrito([{ id: 1, cantidad: 1 }]);
    const user = userEvent.setup();
    await renderApp('/carrito');
    await user.click(screen.getByRole('button', { name: /Vaciar carrito/ }));
    let dialogo = await screen.findByRole('dialog', { name: 'Vaciar carrito' });
    await user.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByLabelText('Cantidad de AMD Ryzen 5 7600X')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Vaciar carrito/ }));
    dialogo = await screen.findByRole('dialog', { name: 'Vaciar carrito' });
    await user.click(within(dialogo).getByRole('button', { name: 'Vaciar' }));
    expect(await screen.findByText('Tu carrito está vacío.')).toBeInTheDocument();
  });

  it('bloquea la compra si el stock cambió', async () => {
    guardarCarrito([{ id: 7, cantidad: 5 }]);
    await renderApp('/carrito');
    expect(screen.getByText(/El stock de algunos productos cambió/)).toBeInTheDocument();
    expect(screen.getByText('Solo quedan 2 unidades')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Comprar ahora/ })).toBeDisabled();
  });
});

describe('checkout y pago (pedido-service)', () => {
  it('envía solo el carrito y el cupón: el backend calcula y devuelve la boleta', async () => {
    guardarCarrito([{ id: 1, cantidad: 1 }]);
    localStorage.setItem(CLAVES.cupon, JSON.stringify({ codigo: 'FELIZ18', descuento: 10 }));
    const user = userEvent.setup();
    await renderApp('/carrito');
    expect(screen.getByText('Cupón FELIZ18 aplicado: 10% de descuento.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Comprar ahora/ }));
    await completarCheckout(user);
    // 249.990 - 10% (24.999) + despacho 3.990
    await user.click(screen.getByRole('button', { name: 'Pagar ahora $228.981' }));
    expect(await screen.findByRole('heading', { name: /Se ha realizado la compra/ })).toBeInTheDocument();
    expect(ultimoEnvio('POST', '/boletas')).toMatchObject({
      cupon: 'FELIZ18',
      items: [{ productoId: 1, cantidad: 1 }],
      cliente: { nombre: 'Pedro', correo: 'pedro@gmail.com' },
      pago: { numeroTarjeta: '4242 4242 4242 4242', vencimiento: '12/30' },
    });
    expect(db().boletas.at(-1)).toMatchObject({ descuento: 24999, total: 228981, cupon: { codigo: 'FELIZ18' } });
    expect(leer(CLAVES.cupon)).toBeNull();
  });

  it('sin productos no muestra el formulario de pago', async () => {
    await renderApp('/checkout');
    // El aviso ocupa toda la página: su título es el h1
    expect(screen.getByRole('heading', { level: 1, name: 'No hay productos para pagar.' })).toBeInTheDocument();
  });

  it('valida los datos del cliente, la dirección y la tarjeta antes de llamar al backend', async () => {
    guardarCarrito([{ id: 1, cantidad: 1 }]);
    const user = userEvent.setup();
    await renderApp('/checkout');
    await user.click(screen.getByRole('button', { name: /Pagar ahora/ }));
    for (const mensaje of [
      'El nombre es obligatorio.',
      'La calle es obligatoria.',
      'Selecciona una región.',
      'La tarjeta debe tener 16 dígitos.',
      'Usa el formato MM/AA.',
    ])
      expect(screen.getByText(mensaje)).toBeInTheDocument();
    expect(ultimoEnvio('POST', '/boletas')).toBeUndefined();
    expect(db().boletas).toHaveLength(5);
  });

  it('autocompleta los datos del cliente con sesión iniciada y suma el envío elegido', async () => {
    iniciarSesionComo('Cliente');
    guardarCarrito([{ id: 1, cantidad: 1 }]);
    const user = userEvent.setup();
    await renderApp('/checkout');
    expect(screen.getByLabelText('Nombre')).toHaveValue('Pedro');
    expect(screen.getByLabelText('Correo')).toHaveValue('cliente@gmail.com');
    expect(screen.getByLabelText('Comuna')).toHaveValue('Providencia');
    expect(screen.getByRole('button', { name: 'Pagar ahora $253.980' })).toBeInTheDocument();
    await user.click(screen.getByLabelText(/Retiro en tienda/));
    expect(screen.getByRole('button', { name: 'Pagar ahora $249.990' })).toBeInTheDocument();
  });

  it('compra exitosa: el backend descuenta stock, se vacía el carrito y se muestra la boleta', async () => {
    iniciarSesionComo('Cliente');
    guardarCarrito([{ id: 1, cantidad: 2 }]);
    const user = userEvent.setup();
    await renderApp('/carrito');
    await user.click(screen.getByRole('button', { name: /Comprar ahora/ }));
    await user.clear(screen.getByLabelText('Correo'));
    await user.type(screen.getByLabelText('Correo'), 'pedro@gmail.com');
    await completarTarjeta(user, '4242 4242 4242 4242');
    const agregados = [];
    const observador = new MutationObserver((cambios) => cambios.forEach((c) => agregados.push(...c.addedNodes)));
    observador.observe(document.body, { childList: true, subtree: true });
    await user.click(screen.getByRole('button', { name: /Pagar ahora/ }));

    expect(await screen.findByRole('heading', { name: /Se ha realizado la compra\. nro #1006/ })).toBeInTheDocument();
    observador.disconnect();
    // Al pagar no debe alcanzar a dibujarse el checkout con el carrito ya vacío
    expect(agregados.some((nodo) => nodo.textContent.includes('No hay productos para pagar.'))).toBe(false);
    expect(screen.getByText('Total pagado')).toBeInTheDocument();
    expect(screen.getByText('$503.970')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Carrito (0)' })).toBeInTheDocument();
    expect(stockDe(1)).toBe(10);
    // El RUN lo pone el backend a partir del token, no el formulario
    expect(db().boletas.at(-1)).toMatchObject({ numero: 1006, estado: 'pagada', total: 503970, cliente: { run: '21456789K' } });

    await user.click(screen.getByRole('button', { name: /Imprimir boleta en PDF/ }));
    expect(window.print).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /Enviar boleta por email/ }));
    expect(screen.getByText('Boleta enviada a pedro@gmail.com (envío simulado).')).toBeInTheDocument();
  });

  it('pago rechazado: conserva carrito y stock, y permite reintentar con los datos precargados', async () => {
    guardarCarrito([{ id: 1, cantidad: 1 }]);
    const user = userEvent.setup();
    await renderApp('/checkout');
    await completarCheckout(user, '4242 4242 4242 0000');
    await user.click(screen.getByRole('button', { name: /Pagar ahora/ }));

    expect(await screen.findByRole('heading', { name: /No se pudo realizar el pago\. nro #1006/ })).toBeInTheDocument();
    expect(screen.getByText(/La tarjeta fue rechazada por el banco emisor/)).toBeInTheDocument();
    expect(stockDe(1)).toBe(12);
    expect(leer(CLAVES.carrito)).toEqual([{ id: 1, cantidad: 1 }]);

    await user.click(screen.getByRole('button', { name: 'VOLVER A REALIZAR EL PAGO' }));
    expect(screen.getByText('Reintentando el pago de la orden #1006.')).toBeInTheDocument();
    expect(screen.getByLabelText('Calle')).toHaveValue('Los Crisantemos 123');
    await completarTarjeta(user, '4242 4242 4242 4242');
    await user.click(screen.getByRole('button', { name: /Pagar ahora/ }));
    expect(await screen.findByRole('heading', { name: /Se ha realizado la compra\. nro #1007/ })).toBeInTheDocument();
    expect(stockDe(1)).toBe(11);
  });

  it('pago rechazado por stock insuficiente', async () => {
    guardarCarrito([{ id: 7, cantidad: 3 }]);
    const user = userEvent.setup();
    await renderApp('/checkout');
    expect(screen.getByText(/Algunos productos ya no tienen stock suficiente/)).toBeInTheDocument();
    await completarCheckout(user);
    await user.click(screen.getByRole('button', { name: /Pagar ahora/ }));
    expect(await screen.findByText(/Stock insuficiente para: NVIDIA GeForce RTX 4080 Super 16GB/)).toBeInTheDocument();
  });

  it('si el servidor no responde avisa, no crea la boleta y deja volver a intentar', async () => {
    guardarCarrito([{ id: 1, cantidad: 1 }]);
    const user = userEvent.setup();
    await renderApp('/checkout');
    await completarCheckout(user);
    db().caido = true;
    await user.click(screen.getByRole('button', { name: /Pagar ahora/ }));
    expect(await screen.findByText(/No se pudo conectar con el servidor/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pagar ahora/ })).toBeEnabled();
    expect(leer(CLAVES.carrito)).toEqual([{ id: 1, cantidad: 1 }]);
    expect(db().boletas).toHaveLength(5);
  });

  it('las vistas de resultado redirigen según el estado; las órdenes no son públicas', async () => {
    iniciarSesionComo('Administrador');
    await renderApp('/compra/exitosa/1003');
    expect(await screen.findByRole('heading', { name: /No se pudo realizar el pago\. nro #1003/ })).toBeInTheDocument();
    cleanup();
    await renderApp('/compra/error/1001');
    expect(await screen.findByRole('heading', { name: /Se ha realizado la compra\. nro #1001/ })).toBeInTheDocument();
    cleanup();
    await renderApp('/compra/exitosa/9999');
    expect(screen.getByText('No encontramos esa orden.')).toBeInTheDocument();
    cleanup();
    localStorage.clear();
    await renderApp('/compra/exitosa/1001');
    expect(screen.getByText('No encontramos esa orden.')).toBeInTheDocument();
  });
});
