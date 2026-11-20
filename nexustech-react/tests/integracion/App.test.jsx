import { describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CLAVES } from '../../src/services/storage.js';
import { productosIniciales } from '../datos/productosIniciales.js';
import { db, iniciarSesionComo, leer, renderApp } from '../utilidades.jsx';

const navegacion = () => screen.getByRole('navigation', { name: 'Navegación principal' });

describe('navegación de la tienda', () => {
  it('cambia de página con NavLink, marca el enlace activo y actualiza el título', async () => {
    const user = userEvent.setup();
    await renderApp('/');
    await user.click(within(navegacion()).getByRole('link', { name: 'Productos' }));
    expect(await screen.findByRole('heading', { name: 'Catálogo NexusTech' })).toBeInTheDocument();
    expect(within(navegacion()).getByRole('link', { name: 'Productos' })).toHaveAttribute('aria-current', 'page');
    expect(document.title).toBe('Productos | NexusTech');
  });

  it('muestra la página 404 para direcciones desconocidas', async () => {
    await renderApp('/ruta-inexistente');
    expect(screen.getByRole('heading', { name: 'Página no encontrada' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/');
  });

  it('el inicio muestra categorías, ofertas y productos destacados', async () => {
    await renderApp('/');
    expect(screen.getByRole('heading', { name: 'Nuestras categorías' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Productos en oferta' })).toBeInTheDocument();
    // 4 ofertas + 8 destacados
    expect(screen.getAllByRole('article')).toHaveLength(12);
  });

  it('el buscador de la cabecera lleva al catálogo filtrado', async () => {
    const user = userEvent.setup();
    await renderApp('/nosotros');
    await user.type(screen.getByLabelText('Buscar productos'), 'ryzen');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    expect(await screen.findByRole('heading', { name: 'Catálogo NexusTech' })).toBeInTheDocument();
    expect(screen.getByLabelText('Buscar producto')).toHaveValue('ryzen');
    expect(screen.getByText('3 producto(s) encontrado(s)')).toBeInTheDocument();
  });

  it('muestra blogs, su detalle y la página nosotros', async () => {
    const user = userEvent.setup();
    await renderApp('/blogs');
    await user.click(screen.getByRole('link', { name: 'Leer más: Cómo elegir tu primera tarjeta de video' }));
    expect(await screen.findByRole('heading', { name: 'Cómo elegir tu primera tarjeta de video' })).toBeInTheDocument();
    cleanup();
    await renderApp('/blogs/99');
    expect(screen.getByText('El artículo no existe.')).toBeInTheDocument();
    cleanup();
    await renderApp('/nosotros');
    expect(screen.getByRole('heading', { name: 'El equipo de desarrollo' })).toBeInTheDocument();
  });
});

describe('catálogo, categorías y ofertas', () => {
  it('combina búsqueda, categoría, tipo, rango y orden, y puede limpiar los filtros', async () => {
    const user = userEvent.setup();
    await renderApp('/productos');
    expect(screen.getAllByRole('article')).toHaveLength(40);
    await user.selectOptions(screen.getByLabelText('Categoría'), 'Periféricos');
    await user.selectOptions(screen.getByLabelText('Tipo'), 'Teclado');
    expect(screen.getAllByRole('article')).toHaveLength(3);
    await user.selectOptions(screen.getByLabelText('Rango de precio'), '0-99999');
    expect(screen.getAllByRole('article')).toHaveLength(2);
    await user.selectOptions(screen.getByLabelText('Ordenar'), 'menor');
    const nombres = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(nombres.slice(-2)).toEqual(['Redragon Kumara K552 RGB', 'Logitech G413 TKL SE']);
    await user.type(screen.getByLabelText('Buscar producto'), 'xyz');
    expect(screen.getByText('No encontramos productos con esos filtros.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(screen.getAllByRole('article')).toHaveLength(40);
  });

  it('separa los productos por categoría y avisa si la categoría no existe', async () => {
    const user = userEvent.setup();
    await renderApp('/categorias');
    await user.click(screen.getByRole('link', { name: /Consolas PlayStation/ }));
    expect(await screen.findByText('6 producto(s) encontrado(s)')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Consolas PlayStation/ })).toHaveAttribute('aria-current', 'page');
    cleanup();
    await renderApp('/categorias/inventada');
    expect(screen.getByText('La categoría no existe.')).toBeInTheDocument();
  });

  it('la vista de ofertas muestra solo productos con descuento', async () => {
    await renderApp('/ofertas');
    const ofertas = productosIniciales.filter((p) => p.descuento > 0);
    expect(screen.getAllByRole('article')).toHaveLength(ofertas.length);
    expect(screen.getByText('-30%')).toBeInTheDocument();
  });

  it('el detalle permite elegir cantidad sin superar el stock', async () => {
    const user = userEvent.setup();
    await renderApp('/productos/7');
    expect(screen.getByRole('heading', { name: 'NVIDIA GeForce RTX 4080 Super 16GB' })).toBeInTheDocument();
    expect(screen.getByText('Últimas 2 unidades')).toBeInTheDocument();
    // Una cantidad con decimales (por ejemplo, pegada) se trunca al entero
    fireEvent.change(screen.getByLabelText('Cantidad'), { target: { value: '1.5' } });
    expect(screen.getByLabelText('Cantidad')).toHaveValue(1);
    await user.click(screen.getByRole('button', { name: 'Sumar una unidad' }));
    expect(screen.getByLabelText('Cantidad')).toHaveValue(2);
    expect(screen.getByRole('button', { name: 'Sumar una unidad' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /Agregar al carrito/ }));
    expect(screen.getByRole('link', { name: 'Carrito (2)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ya tienes todo el stock/ })).toBeDisabled();
    expect(leer(CLAVES.carrito)).toEqual([{ id: 7, cantidad: 2 }]);
  });

  it('avisa cuando el producto no existe', async () => {
    await renderApp('/productos/999');
    expect(screen.getByText('Producto no encontrado.')).toBeInTheDocument();
  });
});

describe('rutas protegidas por rol (JWT)', () => {
  it('sin sesión el panel redirige al login y luego vuelve al panel', async () => {
    const user = userEvent.setup();
    await renderApp('/admin/productos');
    expect(await screen.findByText('Inicia sesión para continuar.')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Correo electrónico'), 'admin@duoc.cl');
    await user.type(screen.getByLabelText('Contraseña'), 'admin123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByRole('heading', { name: 'Productos', level: 1 })).toBeInTheDocument();
  });

  it('un cliente no puede entrar al panel', async () => {
    iniciarSesionComo('Cliente');
    await renderApp('/admin');
    expect(screen.getByText('Acceso denegado')).toBeInTheDocument();
  });

  it('el vendedor solo ve productos y órdenes, sin acciones de escritura', async () => {
    iniciarSesionComo('Vendedor');
    await renderApp('/admin');
    // No tiene dashboard: entra directo a la lista de productos
    expect(await screen.findByRole('heading', { name: 'Productos', level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/Tu rol de vendedor solo permite consultar/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Nuevo producto/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Productos críticos' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Reportes' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Eliminar/ })).not.toBeInTheDocument();
    const menu = screen.getByRole('navigation', { name: 'Menú de administración' });
    const enlaces = within(menu).getAllByRole('link').map((enlace) => enlace.textContent.trim());
    expect(enlaces).toEqual(['Órdenes', 'Productos', 'Tienda']);
  });

  it('el vendedor ve el detalle de productos y órdenes', async () => {
    iniciarSesionComo('Vendedor');
    const user = userEvent.setup();
    await renderApp('/admin/productos');
    await user.click(screen.getByRole('link', { name: 'Ver AMD Ryzen 5 7600X' }));
    expect(await screen.findByRole('heading', { name: 'AMD Ryzen 5 7600X', level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Editar producto/ })).not.toBeInTheDocument();
    cleanup();
    await renderApp('/admin/ordenes');
    await user.click(screen.getByRole('link', { name: 'Ver boleta 1001' }));
    expect(await screen.findByRole('heading', { name: 'Boleta #1001', level: 1 })).toBeInTheDocument();
  });

  it.each(['/admin/productos/nuevo', '/admin/categorias', '/admin/perfil', '/admin/usuarios', '/admin/productos/criticos'])(
    'el vendedor ve acceso denegado en %s',
    async (ruta) => {
      iniciarSesionComo('Vendedor');
      await renderApp(ruta);
      expect(screen.getByText('Acceso denegado')).toBeInTheDocument();
    },
  );

  it('restaura la sesión guardada al volver a montar la aplicación', async () => {
    iniciarSesionComo('Administrador');
    await renderApp('/admin');
    expect(screen.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeInTheDocument();
  });

  it('no restaura una sesión con el token vencido', async () => {
    iniciarSesionComo('Administrador', -60);
    await renderApp('/admin');
    expect(await screen.findByText('Inicia sesión para continuar.')).toBeInTheDocument();
  });

  it('si el backend rechaza el token cierra la sesión y lo avisa', async () => {
    iniciarSesionComo('Administrador');
    db().rechazarTokens = true;
    await renderApp('/admin');
    expect(await screen.findByText('Tu sesión expiró. Inicia sesión nuevamente.')).toBeInTheDocument();
    expect(await screen.findByText('Inicia sesión para continuar.')).toBeInTheDocument();
    await waitFor(() => expect(leer(CLAVES.sesion)).toBeNull());
  });
});

describe('conexión con el backend', () => {
  it('si el servidor no responde lo avisa y permite reintentar', async () => {
    db().caido = true;
    const user = userEvent.setup();
    await renderApp('/');
    expect(screen.getByText(/No se pudo conectar con el servidor/)).toBeInTheDocument();
    db().caido = false;
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('heading', { name: 'Nuestras categorías' })).toBeInTheDocument();
  });
});
