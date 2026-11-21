import { describe, expect, it } from 'vitest';
import { crearEstado, detalleCarrito, resumenCarrito, tiendaReducer } from '../../src/store/tiendaReducer.js';

const mouse = {
  id: 1,
  codigo: 'MOU001',
  nombre: 'Mouse',
  categoria: 'Perifericos',
  categoriaId: 1,
  tipo: 'Mouse',
  descripcion: '',
  precio: 10000,
  stock: 2,
  stockCritico: 1,
  descuento: 0,
  imagen: 'https://example.com/mouse.png',
};
const teclado = { ...mouse, id: 2, codigo: 'TEC001', nombre: 'Teclado', tipo: 'Teclado', precio: 20000, stock: 5, descuento: 50 };
const categorias = [
  { id: 1, nombre: 'Perifericos', slug: 'perifericos', icono: 'bi-mouse2-fill', descripcion: '' },
  { id: 2, nombre: 'Consolas', slug: 'consolas', icono: 'bi-controller', descripcion: '' },
];

const iniciar = (extra = {}) =>
  crearEstado({ productos: [{ ...mouse }, { ...teclado }], categorias, ...extra });

describe('reglas del carrito', () => {
  it('acumula cantidades sin duplicar productos ni mutar el estado anterior', () => {
    const inicial = iniciar();
    const uno = tiendaReducer(inicial, { type: 'AGREGAR', id: 1 });
    const dos = tiendaReducer(uno, { type: 'AGREGAR', id: 1 });
    expect(dos.carrito).toEqual([{ id: 1, cantidad: 2 }]);
    expect(dos.aviso.texto).toBe('Mouse agregado al carrito.');
    expect(inicial.carrito).toEqual([]);
  });

  it('agrega varias unidades desde el detalle y respeta el stock', () => {
    const estado = tiendaReducer(iniciar(), { type: 'AGREGAR', id: 2, cantidad: 5 });
    expect(estado.carrito).toEqual([{ id: 2, cantidad: 5 }]);
    const rechazado = tiendaReducer(estado, { type: 'AGREGAR', id: 2 });
    expect(rechazado.carrito).toEqual(estado.carrito);
    expect(rechazado.aviso.tipo).toBe('warning');
  });

  it('impide agregar productos inexistentes o cantidades inválidas', () => {
    expect(tiendaReducer(iniciar(), { type: 'AGREGAR', id: 99 }).carrito).toEqual([]);
    expect(tiendaReducer(iniciar(), { type: 'AGREGAR', id: 1, cantidad: 0 }).carrito).toEqual([]);
  });

  it.each([-1, 1.5, 3, NaN])('rechaza la cantidad inválida %s', (cantidad) => {
    const inicial = iniciar({ carrito: [{ id: 1, cantidad: 1 }] });
    expect(tiendaReducer(inicial, { type: 'CANTIDAD', id: 1, cantidad }).carrito).toEqual(inicial.carrito);
  });

  it('cambia cantidades y retira el producto (y el cupón) al llegar a cero', () => {
    const inicial = iniciar({ carrito: [{ id: 1, cantidad: 1 }], cupon: { codigo: 'FELIZ18', descuento: 10 } });
    expect(tiendaReducer(inicial, { type: 'CANTIDAD', id: 1, cantidad: 2 }).carrito).toEqual([{ id: 1, cantidad: 2 }]);
    const vacio = tiendaReducer(inicial, { type: 'CANTIDAD', id: 1, cantidad: 0 });
    expect(vacio.carrito).toEqual([]);
    expect(vacio.cupon).toBeNull();
  });

  it('quita un producto y vacía el carrito', () => {
    const inicial = iniciar({ carrito: [{ id: 1, cantidad: 1 }, { id: 2, cantidad: 1 }] });
    expect(tiendaReducer(inicial, { type: 'QUITAR', id: 1 }).carrito).toEqual([{ id: 2, cantidad: 1 }]);
    expect(tiendaReducer(inicial, { type: 'VACIAR' }).carrito).toEqual([]);
  });

  it('calcula subtotal con ofertas, cupón y envío según la entrega', () => {
    const estado = iniciar({
      carrito: [{ id: 1, cantidad: 2 }, { id: 2, cantidad: 1 }],
      cupon: { codigo: 'FELIZ18', descuento: 10 },
    });
    expect(detalleCarrito(estado)[1].precioUnitario).toBe(10000);
    expect(resumenCarrito(estado)).toEqual({ unidades: 3, subtotal: 30000, descuento: 3000, envio: 0, total: 27000 });
    expect(resumenCarrito(estado, 'despacho').total).toBe(30990);
    expect(resumenCarrito(estado, 'retiro').envio).toBe(0);
    expect(resumenCarrito(iniciar(), 'despacho')).toEqual({ unidades: 0, subtotal: 0, descuento: 0, envio: 0, total: 0 });
  });

  it('aplica el cupón que validó el backend y lo quita', () => {
    const conProductos = iniciar({ carrito: [{ id: 1, cantidad: 1 }] });
    const conCupon = tiendaReducer(conProductos, { type: 'APLICAR_CUPON', cupon: { codigo: 'XAVICRIS', descuento: 15 } });
    expect(conCupon.cupon).toEqual({ codigo: 'XAVICRIS', descuento: 15 });
    expect(conCupon.aviso.texto).toBe('Cupón XAVICRIS aplicado.');
    expect(tiendaReducer(conCupon, { type: 'QUITAR_CUPON' }).cupon).toBeNull();
  });
});

describe('carga de datos del backend', () => {
  it('el catálogo llega y del carrito guardado se quitan los productos que ya no existen', () => {
    const inicial = crearEstado({ carrito: [{ id: 1, cantidad: 1 }, { id: 99, cantidad: 1 }] });
    expect(inicial.catalogoListo).toBe(false);
    const estado = tiendaReducer(inicial, { type: 'CATALOGO', productos: [mouse], categorias });
    expect(estado.catalogoListo).toBe(true);
    expect(estado.productos).toEqual([mouse]);
    expect(estado.carrito).toEqual([{ id: 1, cantidad: 1 }]);
  });

  it('si el carrito queda vacío al cargar, se descarta el cupón', () => {
    const inicial = crearEstado({ carrito: [{ id: 99, cantidad: 1 }], cupon: { codigo: 'FELIZ18', descuento: 10 } });
    expect(tiendaReducer(inicial, { type: 'CATALOGO', productos: [mouse], categorias }).cupon).toBeNull();
  });

  it('las órdenes del panel se cargan y se olvidan al salir', () => {
    const conOrdenes = tiendaReducer(iniciar(), { type: 'ORDENES', ordenes: [{ numero: 1001 }] });
    expect(conOrdenes).toMatchObject({ ordenes: [{ numero: 1001 }], ordenesListas: true });
    expect(tiendaReducer(conOrdenes, { type: 'SIN_ORDENES' })).toMatchObject({ ordenes: [], ordenesListas: false });
  });

  it('guarda el error de carga para ofrecer reintentar', () => {
    expect(tiendaReducer(iniciar(), { type: 'ERROR_CARGA', texto: 'Sin conexión' }).errorCarga).toBe('Sin conexión');
  });
});

describe('boleta devuelta por pedido-service', () => {
  const orden = (estado) => ({ numero: 1006, estado, items: [{ id: 1, cantidad: 2 }] });

  it('pagada: registra la orden, vacía el carrito y refleja el stock descontado', () => {
    const inicial = iniciar({ carrito: [{ id: 1, cantidad: 2 }], cupon: { codigo: 'FELIZ18', descuento: 10 } });
    const final = tiendaReducer(inicial, { type: 'COMPRA', orden: orden('pagada') });
    expect(final.ordenes).toEqual([orden('pagada')]);
    expect(final.carrito).toEqual([]);
    expect(final.cupon).toBeNull();
    expect(final.productos[0].stock).toBe(0);
    expect(final.productos[1].stock).toBe(5);
    expect(final.aviso.texto).toBe('Compra #1006 realizada con éxito.');
  });

  it('rechazada: registra la orden pero conserva carrito, cupón y stock', () => {
    const inicial = iniciar({ carrito: [{ id: 1, cantidad: 2 }], cupon: { codigo: 'FELIZ18', descuento: 10 } });
    const final = tiendaReducer(inicial, { type: 'COMPRA', orden: orden('rechazada') });
    expect(final.ordenes).toHaveLength(1);
    expect(final.carrito).toEqual(inicial.carrito);
    expect(final.cupon).toEqual(inicial.cupon);
    expect(final.productos[0].stock).toBe(2);
    expect(final.aviso).toMatchObject({ texto: 'No se pudo realizar el pago.', tipo: 'danger' });
  });
});

describe('CRUD con la respuesta del backend', () => {
  it('agrega un producto nuevo y reemplaza uno editado', () => {
    const nuevo = { ...mouse, id: 3, codigo: 'AUD001', nombre: 'Audífonos' };
    const creado = tiendaReducer(iniciar(), { type: 'PRODUCTO_GUARDADO', producto: nuevo, nuevo: true });
    expect(creado.productos).toHaveLength(3);
    expect(creado.aviso.texto).toBe('Producto "Audífonos" creado.');
    const editado = tiendaReducer(creado, { type: 'PRODUCTO_GUARDADO', producto: { ...nuevo, precio: 1 }, nuevo: false });
    expect(editado.productos.find((p) => p.id === 3).precio).toBe(1);
    expect(editado.aviso.texto).toBe('Producto "Audífonos" actualizado.');
  });

  it('al eliminar un producto también lo saca del carrito', () => {
    const inicial = iniciar({ carrito: [{ id: 1, cantidad: 1 }], cupon: { codigo: 'FELIZ18', descuento: 10 } });
    const final = tiendaReducer(inicial, { type: 'PRODUCTO_ELIMINADO', id: 1 });
    expect(final.productos.map((p) => p.id)).toEqual([2]);
    expect(final.carrito).toEqual([]);
    expect(final.cupon).toBeNull();
  });

  it('al renombrar una categoría actualiza el nombre en sus productos', () => {
    const renombrada = { ...categorias[0], nombre: 'Periféricos y Audio' };
    const final = tiendaReducer(iniciar(), { type: 'CATEGORIA_GUARDADA', categoria: renombrada, nuevo: false });
    expect(final.categorias[0].nombre).toBe('Periféricos y Audio');
    expect(final.productos.map((p) => p.categoria)).toEqual(['Periféricos y Audio', 'Periféricos y Audio']);
    expect(final.aviso.texto).toBe('Categoría "Periféricos y Audio" actualizada.');
  });

  it('crea y elimina categorías', () => {
    const nueva = { id: 3, nombre: 'Audio', slug: 'audio', icono: 'bi-headphones', descripcion: '' };
    const creada = tiendaReducer(iniciar(), { type: 'CATEGORIA_GUARDADA', categoria: nueva, nuevo: true });
    expect(creada.categorias).toHaveLength(3);
    const eliminada = tiendaReducer(creada, { type: 'CATEGORIA_ELIMINADA', id: 3 });
    expect(eliminada.categorias).toHaveLength(2);
    expect(eliminada.aviso.texto).toBe('Categoría "Audio" eliminada.');
  });

  it('muestra y cierra avisos, e ignora acciones desconocidas', () => {
    const conAviso = tiendaReducer(iniciar(), { type: 'AVISO', texto: 'Error del servidor', tipo: 'danger' });
    expect(conAviso.aviso).toMatchObject({ texto: 'Error del servidor', tipo: 'danger' });
    expect(tiendaReducer(conAviso, { type: 'CERRAR_AVISO' }).aviso).toBeNull();
    expect(tiendaReducer(conAviso, { type: 'OTRA' })).toBe(conAviso);
  });
});
