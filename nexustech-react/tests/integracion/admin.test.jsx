import { describe, expect, it } from 'vitest';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CLAVES } from '../../src/services/storage.js';
import { db, guardarCarrito, iniciarSesionComo, leer, renderApp, ultimoEnvio } from '../utilidades.jsx';

const titulo = (nombre) => screen.findByRole('heading', { name: nombre, level: 1 });

async function confirmarEnModal(user, nombreDialogo, boton) {
  const dialogo = await screen.findByRole('dialog', { name: nombreDialogo });
  await user.click(within(dialogo).getByRole('button', { name: boton }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
}

describe('dashboard, órdenes y reportes (datos de pedido-service)', () => {
  it('el dashboard muestra métricas y accesos a cada módulo', async () => {
    iniciarSesionComo('Administrador');
    await renderApp('/admin');
    expect(screen.getByRole('heading', { name: 'Compras' })).toBeInTheDocument();
    expect(screen.getByText('Hay 3 producto(s) con stock crítico.')).toBeInTheDocument();
    expect(screen.getByText('Clientes registrados: 1')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Reportes Informes/ })).toHaveAttribute('href', '/admin/reportes');
  });

  it('filtra órdenes por estado y muestra la boleta', async () => {
    iniciarSesionComo('Administrador');
    const user = userEvent.setup();
    await renderApp('/admin/ordenes');
    await user.selectOptions(screen.getByLabelText('Filtrar por estado'), 'rechazada');
    expect(screen.getAllByRole('link', { name: /Ver boleta/ })).toHaveLength(1);
    await user.click(screen.getByRole('link', { name: 'Ver boleta 1003' }));
    expect(await titulo('Boleta #1003')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByText(/Motivo: La tarjeta fue rechazada/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Imprimir/ }));
    expect(window.print).toHaveBeenCalled();
  });

  it('muestra reportes de ventas e inventario', async () => {
    iniciarSesionComo('Administrador');
    await renderApp('/admin/reportes');
    expect(screen.getByRole('heading', { name: 'Ventas por categoría' })).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: /Notebooks/ })).toBeInTheDocument();
    cleanup();
    await renderApp('/admin/productos/reportes');
    expect(screen.getByRole('heading', { name: 'Productos más vendidos' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: /Componentes/ })).toBeInTheDocument();
  });

  it('lista los productos críticos', async () => {
    iniciarSesionComo('Administrador');
    await renderApp('/admin/productos/criticos');
    expect(screen.getAllByRole('link', { name: 'Reponer stock' })).toHaveLength(3);
  });
});

describe('CRUD de productos (producto-service)', () => {
  it('crea, muestra y edita un producto conservando su id', async () => {
    iniciarSesionComo('Administrador');
    const user = userEvent.setup();
    await renderApp('/admin/productos');
    await user.click(screen.getByRole('link', { name: /Nuevo producto/ }));
    await user.click(await screen.findByRole('button', { name: 'Guardar producto' }));
    expect(screen.getByText('El código es obligatorio.')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Código'), 'aud010');
    await user.type(screen.getByLabelText('Nombre del producto'), 'Audífonos Pro');
    await user.selectOptions(screen.getByLabelText('Categoría'), 'Periféricos');
    await user.type(screen.getByLabelText('Tipo'), 'Audifonos');
    await user.type(screen.getByLabelText('Precio'), '15000');
    await user.type(screen.getByLabelText('Stock'), '3');
    await user.type(screen.getByLabelText('Descuento %'), '10');
    expect(screen.getByText('$13.500')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Guardar producto' }));

    expect(await screen.findByText('Producto "Audífonos Pro" creado.')).toBeInTheDocument();
    // El formulario elige la categoría por nombre; al backend se envía su id
    expect(ultimoEnvio('POST', '/productos')).toMatchObject({ codigo: 'AUD010', categoriaId: 2 });
    expect(db().productos.at(-1)).toMatchObject({ id: 41, codigo: 'AUD010', precio: 15000, stock: 3, descuento: 10 });

    await user.click(await screen.findByRole('link', { name: 'Editar Audífonos Pro' }));
    await user.clear(await screen.findByLabelText('Precio'));
    await user.type(screen.getByLabelText('Precio'), '20000');
    await user.click(screen.getByRole('button', { name: 'Guardar producto' }));
    expect(await titulo('Audífonos Pro')).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /Precio normal/ })).toHaveTextContent('$20.000');
    expect(db().productos.filter((p) => p.codigo === 'AUD010')).toEqual([
      expect.objectContaining({ id: 41, precio: 20000 }),
    ]);
  });

  it('rechaza un código repetido antes de enviar', async () => {
    iniciarSesionComo('Administrador');
    const user = userEvent.setup();
    await renderApp('/admin/productos/nuevo');
    await user.type(screen.getByLabelText('Código'), 'cpu001');
    expect(screen.getByText('Ya existe un producto con ese código.')).toBeInTheDocument();
  });

  it('cancela y confirma la eliminación, retirando el producto del carrito', async () => {
    iniciarSesionComo('Administrador');
    guardarCarrito([{ id: 1, cantidad: 1 }]);
    const user = userEvent.setup();
    await renderApp('/admin/productos');
    await user.click(screen.getByRole('button', { name: 'Eliminar AMD Ryzen 5 7600X' }));
    await confirmarEnModal(user, 'Eliminar producto', 'Cancelar');
    expect(screen.getByRole('link', { name: 'Editar AMD Ryzen 5 7600X' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Eliminar AMD Ryzen 5 7600X' }));
    await confirmarEnModal(user, 'Eliminar producto', 'Eliminar');
    await waitFor(() => expect(screen.queryByRole('link', { name: 'Editar AMD Ryzen 5 7600X' })).not.toBeInTheDocument());
    expect(db().productos).toHaveLength(39);
    expect(leer(CLAVES.carrito)).toEqual([]);
  });

  it('si el backend rechaza el cambio muestra su mensaje y no navega', async () => {
    iniciarSesionComo('Administrador');
    const user = userEvent.setup();
    await renderApp('/admin/productos/nuevo');
    // Otro administrador creó el mismo código mientras tanto
    db().productos.push({ ...db().productos[0], id: 99, codigo: 'NUEVO1' });
    await user.type(screen.getByLabelText('Código'), 'nuevo1');
    await user.type(screen.getByLabelText('Nombre del producto'), 'Repetido');
    await user.selectOptions(screen.getByLabelText('Categoría'), 'Consolas');
    await user.type(screen.getByLabelText('Tipo'), 'Consola');
    await user.type(screen.getByLabelText('Precio'), '1000');
    await user.type(screen.getByLabelText('Stock'), '1');
    await user.click(screen.getByRole('button', { name: 'Guardar producto' }));
    expect(await screen.findByText('Ya existe un producto con ese código.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Nuevo producto', level: 1 })).toBeInTheDocument();
  });

  it('busca productos en la tabla', async () => {
    iniciarSesionComo('Administrador');
    const user = userEvent.setup();
    await renderApp('/admin/productos');
    await user.type(screen.getByLabelText('Buscar producto'), 'zzz');
    expect(screen.getByText('No hay productos que coincidan.')).toBeInTheDocument();
  });

  it('Cancelar en editar producto o usuario vuelve a su ficha, aunque se abra directo', async () => {
    iniciarSesionComo('Administrador');
    const user = userEvent.setup();
    await renderApp('/admin/productos/1/editar');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(await titulo('AMD Ryzen 5 7600X')).toBeInTheDocument();
    cleanup();
    await renderApp('/admin/usuarios/21456789K/editar');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(await titulo('Pedro Soto Fuentes')).toBeInTheDocument();
  });
});

describe('CRUD de categorías (producto-service)', () => {
  it('crea una categoría, la renombra y no elimina una categoría con productos', async () => {
    iniciarSesionComo('Administrador');
    const user = userEvent.setup();
    await renderApp('/admin/categorias/nueva');
    await user.type(screen.getByLabelText('Nombre de la categoría'), 'Audio y Video');
    expect(screen.getByText('Dirección en la tienda: /categorias/audio-y-video')).toBeInTheDocument();
    await user.click(screen.getByLabelText('Ícono headphones'));
    await user.click(screen.getByRole('button', { name: 'Guardar categoría' }));
    expect(await screen.findByRole('link', { name: '/categorias/audio-y-video' })).toBeInTheDocument();
    expect(db().categorias.at(-1)).toMatchObject({ id: 5, slug: 'audio-y-video', icono: 'bi-headphones' });

    await user.click(screen.getByRole('link', { name: 'Editar categoría Consolas' }));
    const nombre = await screen.findByLabelText('Nombre de la categoría');
    await user.clear(nombre);
    await user.type(nombre, 'Consolas y Juegos');
    await user.click(screen.getByRole('button', { name: 'Guardar categoría' }));
    expect(await screen.findByRole('link', { name: '/categorias/consolas-y-juegos' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Eliminar categoría Consolas y Juegos' }));
    // Los productos siguen su categoría por id: el modal ya los cuenta con el nombre nuevo
    const dialogo = await screen.findByRole('dialog', { name: 'Eliminar categoría' });
    expect(within(dialogo).getByText(/tiene 6 producto\(s\)/)).toBeInTheDocument();
    expect(within(dialogo).queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument();
    await confirmarEnModal(user, 'Eliminar categoría', 'Cancelar');

    await user.click(screen.getByRole('button', { name: 'Eliminar categoría Audio y Video' }));
    await confirmarEnModal(user, 'Eliminar categoría', 'Eliminar');
    await waitFor(() => expect(screen.queryByRole('link', { name: '/categorias/audio-y-video' })).not.toBeInTheDocument());
    expect(db().categorias).toHaveLength(4);
  });
});

describe('CRUD de usuarios y perfil (usuario-service)', () => {
  it('crea un vendedor, lo muestra, lo edita sin cambiar su contraseña y lo elimina', async () => {
    iniciarSesionComo('Administrador');
    const user = userEvent.setup();
    await renderApp('/admin/usuarios/nuevo');
    await user.type(screen.getByLabelText('RUN'), '111111111');
    await user.type(screen.getByLabelText('Nombre'), 'Lucía');
    await user.type(screen.getByLabelText('Apellidos'), 'Pérez');
    await user.type(screen.getByLabelText('Correo electrónico'), 'lucia@duoc.cl');
    await user.type(screen.getByLabelText('Contraseña'), 'clave1');
    await user.selectOptions(screen.getByLabelText('Tipo de usuario'), 'Vendedor');
    await user.selectOptions(screen.getByLabelText('Región'), 'Región de Coquimbo');
    await user.selectOptions(screen.getByLabelText('Comuna'), 'Ovalle');
    await user.type(screen.getByLabelText('Dirección'), 'Calle 1');
    await user.click(screen.getByRole('button', { name: 'Guardar usuario' }));
    expect(await titulo('Usuarios')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Ver Lucía' }));
    expect(await titulo('Lucía Pérez')).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: /Editar usuario/ }));
    const nombre = await screen.findByLabelText('Nombre');
    // El backend nunca devuelve la contraseña: vacía significa "mantener la actual"
    expect(screen.getByLabelText('Contraseña')).toHaveValue('');
    await user.clear(nombre);
    await user.type(nombre, 'Lucía Andrea');
    await user.click(screen.getByRole('button', { name: 'Guardar usuario' }));
    expect(await titulo('Lucía Andrea Pérez')).toBeInTheDocument();
    expect(db().usuarios.find((u) => u.run === '111111111')).toMatchObject({ nombre: 'Lucía Andrea', clave: 'clave1' });

    await user.click(screen.getByRole('link', { name: 'Volver' }));
    await user.click(await screen.findByRole('button', { name: 'Eliminar Lucía Andrea' }));
    await confirmarEnModal(user, 'Eliminar usuario', 'Eliminar');
    await waitFor(() => expect(db().usuarios.some((u) => u.run === '111111111')).toBe(false));
  });

  it('protege la propia cuenta y filtra por rol', async () => {
    iniciarSesionComo('Administrador');
    const user = userEvent.setup();
    await renderApp('/admin/usuarios');
    expect(screen.getByRole('button', { name: 'Eliminar Admin' })).toBeDisabled();
    await user.selectOptions(screen.getByLabelText('Filtrar por rol'), 'Cliente');
    expect(screen.getAllByRole('row')).toHaveLength(2);
    // La cuenta propia se edita desde el perfil, donde no se cambia el rol
    cleanup();
    await renderApp('/admin/usuarios/190110222/editar');
    expect(await titulo('Mi perfil')).toBeInTheDocument();
  });

  it('muestra el historial de compras de un cliente', async () => {
    iniciarSesionComo('Administrador');
    await renderApp('/admin/usuarios/21456789K/compras');
    expect(screen.getByRole('heading', { name: 'Historial de compras de Pedro Soto Fuentes' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Ver boleta/ })).toHaveLength(3);
  });

  it('el perfil se guarda en /usuarios/me y actualiza la sesión', async () => {
    iniciarSesionComo('Administrador');
    const user = userEvent.setup();
    await renderApp('/admin/perfil');
    expect(screen.getByLabelText('RUN')).toBeDisabled();
    const nombre = screen.getByLabelText('Nombre');
    await user.clear(nombre);
    await user.type(nombre, 'Administradora');
    await user.click(screen.getByRole('button', { name: 'Guardar mis datos' }));
    expect(await screen.findByText('Administradora (Administrador)')).toBeInTheDocument();
    expect(ultimoEnvio('PUT', '/usuarios/me')).toMatchObject({ nombre: 'Administradora', clave: '' });
    expect(leer(CLAVES.sesion)).toMatchObject({ nombre: 'Administradora', token: expect.any(String) });
  });

  it('cerrar sesión desde el panel vuelve a la tienda y borra el token', async () => {
    iniciarSesionComo('Administrador');
    const user = userEvent.setup();
    await renderApp('/admin/perfil');
    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    // Debe llegar al inicio de la tienda, no al login recordando la ruta del panel
    expect(await screen.findByRole('heading', { name: 'Nuestras categorías' })).toBeInTheDocument();
    expect(screen.queryByText('Inicia sesión para continuar.')).not.toBeInTheDocument();
    expect(localStorage.getItem(CLAVES.sesion)).toBeNull();
  });
});
