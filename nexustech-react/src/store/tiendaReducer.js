// ============================================================
// NexusTech - Reducer de la tienda
// Función pura: recibe el estado y una acción y devuelve el
// estado siguiente, sin tocar el DOM, localStorage ni la red.
// Los datos llegan del backend (TiendaProvider hace las llamadas);
// el carrito y el cupón se manejan aquí, en el navegador.
// Estado: { productos, categorias, ordenes, carrito, cupon, aviso,
//           catalogoListo, ordenesListas, errorCarga }
// ============================================================

import { COSTO_DESPACHO } from '../data/configuracion.js';
import { actualizar, crear, eliminar, obtener } from '../services/crud.js';
import { conAviso } from './aviso.js';
import { precioFinal } from '../utils/formatos.js';

export function crearEstado({
  productos = [],
  categorias = [],
  ordenes = [],
  carrito = [],
  cupon = null,
} = {}) {
  return {
    productos,
    categorias,
    ordenes,
    carrito,
    cupon,
    aviso: null,
    catalogoListo: false, // ya llegaron productos y categorías
    ordenesListas: false, // órdenes del panel (administrador y vendedor)
    errorCarga: '',
  };
}

// ---------- Valores derivados (no se guardan) ----------

export function detalleCarrito(estado) {
  return estado.carrito
    .map((item) => {
      const producto = obtener(estado.productos, item.id);
      return producto
        ? { ...producto, precioUnitario: precioFinal(producto), cantidad: item.cantidad }
        : null;
    })
    .filter(Boolean);
}

// Lo que se muestra antes de pagar. El total definitivo lo calcula el backend.
// entrega: null (aún no se elige), 'despacho' o 'retiro'
export function resumenCarrito(estado, entrega = null) {
  const detalle = detalleCarrito(estado);
  const unidades = detalle.reduce((total, p) => total + p.cantidad, 0);
  const subtotal = detalle.reduce((total, p) => total + p.precioUnitario * p.cantidad, 0);
  const descuento = estado.cupon ? Math.round((subtotal * estado.cupon.descuento) / 100) : 0;
  const envio = entrega === 'despacho' && detalle.length ? COSTO_DESPACHO : 0;
  return { unidades, subtotal, descuento, envio, total: subtotal - descuento + envio };
}

const sinCuponSiVacio = (estado, carrito) => ({ ...estado, carrito, cupon: carrito.length ? estado.cupon : null });

// ---------- Carrito ----------

function agregar(estado, { id, cantidad = 1 }) {
  const producto = obtener(estado.productos, id);
  const item = obtener(estado.carrito, id);
  const nueva = (item?.cantidad ?? 0) + cantidad;
  if (!producto || !Number.isInteger(cantidad) || cantidad < 1 || nueva > producto.stock)
    return conAviso(estado, 'No hay más stock disponible de ese producto.', 'warning');

  const carrito = item
    ? actualizar(estado.carrito, id, { cantidad: nueva })
    : crear(estado.carrito, { id, cantidad });
  return conAviso({ ...estado, carrito }, `${producto.nombre} agregado al carrito.`);
}

function cambiarCantidad(estado, { id, cantidad }) {
  const producto = obtener(estado.productos, id);
  if (!producto || !Number.isInteger(cantidad) || cantidad < 0 || cantidad > producto.stock)
    return conAviso(estado, 'La cantidad debe ser un entero y no superar el stock.', 'warning');

  const carrito =
    cantidad === 0
      ? eliminar(estado.carrito, id)
      : actualizar(estado.carrito, id, { cantidad });
  return { ...sinCuponSiVacio(estado, carrito), aviso: null };
}

// ---------- Respuestas del backend ----------

function catalogo(estado, { productos, categorias }) {
  // Del carrito guardado se descartan los productos que ya no existen
  const carrito = estado.carrito.filter((item) => obtener(productos, item.id));
  return { ...sinCuponSiVacio(estado, carrito), productos, categorias, catalogoListo: true, errorCarga: '' };
}

// Boleta devuelta por el backend: pagada (se vacía el carrito) o rechazada (se conserva).
// El backend ya descontó el stock; aquí se refleja lo mismo sin volver a pedir el catálogo.
function compra(estado, { orden }) {
  const ordenes = [...eliminar(estado.ordenes, orden.numero, 'numero'), orden];
  if (orden.estado !== 'pagada')
    return conAviso({ ...estado, ordenes }, 'No se pudo realizar el pago.', 'danger');
  const productos = estado.productos.map((p) => {
    const item = obtener(orden.items, p.id);
    return item ? { ...p, stock: p.stock - item.cantidad } : p;
  });
  return conAviso(
    { ...estado, productos, ordenes, carrito: [], cupon: null },
    `Compra #${orden.numero} realizada con éxito.`,
  );
}

function productoGuardado(estado, { producto, nuevo }) {
  const productos = nuevo
    ? crear(estado.productos, producto)
    : actualizar(estado.productos, producto.id, producto);
  return conAviso(
    { ...estado, productos },
    `Producto "${producto.nombre}" ${nuevo ? 'creado' : 'actualizado'}.`,
  );
}

function productoEliminado(estado, { id }) {
  const producto = obtener(estado.productos, id);
  return conAviso(
    { ...sinCuponSiVacio(estado, eliminar(estado.carrito, id)), productos: eliminar(estado.productos, id) },
    `Producto "${producto?.nombre}" eliminado del catálogo y del carrito.`,
    'info',
  );
}

function categoriaGuardada(estado, { categoria, nuevo }) {
  const categorias = nuevo
    ? crear(estado.categorias, categoria)
    : actualizar(estado.categorias, categoria.id, categoria);
  // Los productos muestran el nombre de su categoría: si cambió, se actualiza también ahí
  const productos = estado.productos.map((p) =>
    p.categoriaId === categoria.id ? { ...p, categoria: categoria.nombre } : p,
  );
  return conAviso(
    { ...estado, categorias, productos },
    `Categoría "${categoria.nombre}" ${nuevo ? 'creada' : 'actualizada'}.`,
  );
}

function categoriaEliminada(estado, { id }) {
  const categoria = obtener(estado.categorias, id);
  return conAviso(
    { ...estado, categorias: eliminar(estado.categorias, id) },
    `Categoría "${categoria?.nombre}" eliminada.`,
    'info',
  );
}

export function tiendaReducer(estado, accion) {
  switch (accion.type) {
    case 'AGREGAR':
      return agregar(estado, accion);
    case 'CANTIDAD':
      return cambiarCantidad(estado, accion);
    case 'QUITAR':
      return conAviso(sinCuponSiVacio(estado, eliminar(estado.carrito, accion.id)), 'Producto retirado del carrito.', 'info');
    case 'VACIAR':
      return conAviso({ ...estado, carrito: [], cupon: null }, 'El carrito quedó vacío.', 'info');
    case 'APLICAR_CUPON':
      return conAviso({ ...estado, cupon: accion.cupon }, `Cupón ${accion.cupon.codigo} aplicado.`);
    case 'QUITAR_CUPON':
      return { ...estado, cupon: null };
    case 'CATALOGO':
      return catalogo(estado, accion);
    case 'ERROR_CARGA':
      return { ...estado, errorCarga: accion.texto };
    case 'ORDENES':
      return { ...estado, ordenes: accion.ordenes, ordenesListas: true };
    case 'SIN_ORDENES':
      return { ...estado, ordenes: [], ordenesListas: false };
    case 'COMPRA':
      return compra(estado, accion);
    case 'PRODUCTO_GUARDADO':
      return productoGuardado(estado, accion);
    case 'PRODUCTO_ELIMINADO':
      return productoEliminado(estado, accion);
    case 'CATEGORIA_GUARDADA':
      return categoriaGuardada(estado, accion);
    case 'CATEGORIA_ELIMINADA':
      return categoriaEliminada(estado, accion);
    case 'AVISO':
      return conAviso(estado, accion.texto, accion.tipo);
    case 'CERRAR_AVISO':
      return { ...estado, aviso: null };
    default:
      return estado;
  }
}
