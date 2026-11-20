// ============================================================
// NexusTech - Servidor falso para las pruebas
// Reemplaza a fetch y responde como el API Gateway: mismas rutas
// /api/v1, mismos JSON, códigos HTTP y mensajes de error. Los datos
// viven en memoria (db) y parten igual que la base del backend.
// Así las pruebas no necesitan los microservicios encendidos.
// ============================================================

import { vi } from 'vitest';
import { productosIniciales } from './datos/productosIniciales.js';
import { categoriasIniciales } from './datos/categoriasIniciales.js';
import { usuariosIniciales } from './datos/usuariosIniciales.js';
import { ordenesIniciales } from './datos/ordenesIniciales.js';
import { CUPONES } from './datos/cupones.js';
import { COSTO_DESPACHO } from '../src/data/configuracion.js';
import { crearSlug, diaChile, precioFinal } from '../src/utils/formatos.js';

const ADMIN = ['Administrador'];
const PANEL = ['Administrador', 'Vendedor'];
const base64 = (objeto) => btoa(JSON.stringify(objeto)).replace(/=+$/, '');

// Token con forma de JWT: el frontend lee "exp" para saber si la sesión sigue vigente
export function tokenFalso(usuario, segundos = 3600) {
  const exp = Math.floor(Date.now() / 1000) + segundos;
  return `${base64({ alg: 'HS256' })}.${base64({ sub: String(usuario.id), rol: usuario.tipo, exp })}.firma`;
}

export function crearServidorFalso() {
  const categoriaId = (nombre) => categoriasIniciales.find((c) => c.nombre === nombre).id;
  const db = {
    categorias: structuredClone(categoriasIniciales),
    productos: productosIniciales.map((p) => ({ ...p, categoriaId: categoriaId(p.categoria) })),
    usuarios: usuariosIniciales.map((u, i) => ({ ...u, id: i + 1 })),
    boletas: structuredClone(ordenesIniciales).map((o) => ({
      ...o,
      items: o.items.map(({ id, ...item }) => ({ productoId: id, ...item })),
    })),
    caido: false, // true: fetch falla como si el servidor no respondiera
    rechazarTokens: false, // true: todo token se considera vencido (401)
  };

  const respuesta = (status, cuerpo = null) => ({ ok: status < 400, status, json: async () => cuerpo });
  const error = (status, detail) => respuesta(status, { status, detail });
  const siguiente = (lista, campo = 'id') => Math.max(0, ...lista.map((e) => e[campo])) + 1;
  const conCategoria = (p) => ({ ...p, categoria: db.categorias.find((c) => c.id === p.categoriaId)?.nombre });
  // Como el backend: sin la clave y con la fecha vacía como null
  const publico = (usuario) => {
    const copia = { ...usuario, fechaNacimiento: usuario.fechaNacimiento || null };
    delete copia.clave;
    return copia;
  };

  function usuarioDel(headers = {}) {
    const token = headers.Authorization?.replace('Bearer ', '');
    if (!token) return null;
    const { sub, exp } = JSON.parse(atob(token.split('.')[1]));
    const usuario = db.usuarios.find((u) => u.id === Number(sub));
    return !db.rechazarTokens && exp * 1000 > Date.now() && usuario ? usuario : 'invalido';
  }

  // Devuelve la respuesta de error si el usuario no puede pasar; si puede, null
  function exigir(usuario, roles) {
    if (!usuario) return respuesta(401);
    return roles && !roles.includes(usuario.tipo) ? respuesta(403) : null;
  }

  function guardar(lista, elemento, nuevo) {
    db[lista] = nuevo ? [...db[lista], elemento] : db[lista].map((e) => (e.id === elemento.id ? elemento : e));
  }

  function guardarUsuario(id, datos) {
    const otros = db.usuarios.filter((u) => u.id !== id);
    if (otros.some((u) => u.run === datos.run)) return error(409, 'Ya existe un usuario con ese RUN.');
    if (otros.some((u) => u.correo === datos.correo)) return error(409, 'Ya existe un usuario con ese correo.');
    const anterior = db.usuarios.find((u) => u.id === id);
    // Al editar, una clave vacía mantiene la anterior
    const usuario = { ...anterior, ...datos, id: id ?? siguiente(db.usuarios), clave: datos.clave || anterior?.clave };
    guardar('usuarios', usuario, id === null);
    return respuesta(id === null ? 201 : 200, publico(usuario));
  }

  function guardarProducto(id, datos) {
    if (db.productos.some((p) => p.id !== id && p.codigo === datos.codigo))
      return error(409, 'Ya existe un producto con ese código.');
    const producto = { ...datos, id: id ?? siguiente(db.productos) };
    delete producto.categoria; // el backend guarda solo categoriaId
    guardar('productos', producto, id === null);
    return respuesta(id === null ? 201 : 200, conCategoria(producto));
  }

  function guardarCategoria(id, { nombre, icono, descripcion }) {
    const slug = crearSlug(nombre);
    if (db.categorias.some((c) => c.id !== id && c.slug === slug))
      return error(409, 'Ya existe una categoría con ese nombre.');
    const categoria = { id: id ?? siguiente(db.categorias), nombre: nombre.trim(), slug, icono: icono || 'bi-tag', descripcion: (descripcion ?? '').trim() };
    guardar('categorias', categoria, id === null);
    return respuesta(id === null ? 201 : 200, categoria);
  }

  function eliminarCategoria(id) {
    const categoria = db.categorias.find((c) => c.id === id);
    const enUso = db.productos.filter((p) => p.categoriaId === id).length;
    if (enUso) return error(409, `No se puede eliminar "${categoria.nombre}": tiene ${enUso} producto(s).`);
    db.categorias = db.categorias.filter((c) => c.id !== id);
    return respuesta(204);
  }

  // Mismas reglas que pedido-service: precios del catálogo, stock, tarjeta 0000, cupón y despacho
  function comprar({ cliente, entrega, items: pedido, cupon: codigo, pago }, usuario) {
    const cupon = codigo ? CUPONES.find((c) => c.codigo === codigo) : null;
    if (codigo && !cupon) return error(400, `El cupón "${codigo}" no existe.`);
    const lineas = pedido.map((i) => ({ ...i, producto: db.productos.find((p) => p.id === i.productoId) }));
    const sinStock = lineas
      .filter((l) => !l.producto || l.cantidad > l.producto.stock)
      .map((l) => l.producto?.nombre ?? `Producto ${l.productoId}`);
    const digitos = pago.numeroTarjeta.replace(/\D/g, '');
    const motivo = sinStock.length
      ? `Stock insuficiente para: ${sinStock.join(', ')}. Revisa las cantidades de tu carrito.`
      : digitos.endsWith('0000')
        ? 'La tarjeta fue rechazada por el banco emisor.'
        : '';
    const items = lineas
      .filter((l) => l.producto)
      .map(({ producto: p, cantidad }) => ({
        productoId: p.id,
        codigo: p.codigo,
        nombre: p.nombre,
        categoria: conCategoria(p).categoria,
        imagen: p.imagen,
        precio: precioFinal(p),
        cantidad,
      }));
    if (!motivo) items.forEach((i) => (db.productos.find((p) => p.id === i.productoId).stock -= i.cantidad));

    const subtotal = items.reduce((total, i) => total + i.precio * i.cantidad, 0);
    const descuento = cupon ? Math.round((subtotal * cupon.descuento) / 100) : 0;
    const envio = entrega.tipo === 'despacho' && items.length ? COSTO_DESPACHO : 0;
    const numero = siguiente(db.boletas, 'numero');
    const fecha = new Date().toISOString();
    const boleta = {
      numero,
      codigo: `ORD-${diaChile(fecha).replaceAll('-', '')}-${numero}`,
      fecha,
      estado: motivo ? 'rechazada' : 'pagada',
      motivo,
      usuarioId: usuario?.id ?? null,
      cliente: { ...cliente, run: usuario?.run ?? '' },
      entrega,
      pago: { tarjeta: `**** ${digitos.slice(-4)}` },
      cupon,
      items,
      subtotal,
      descuento,
      envio,
      total: subtotal - descuento + envio,
    };
    db.boletas.push(boleta);
    return respuesta(201, boleta);
  }

  // [método, ruta, manejador]. :param se recibe como "param" (texto) e "id" (número).
  const rutas = [
    ['POST', '/auth/login', ({ datos }) => {
      const usuario = db.usuarios.find((u) => u.correo === datos.correo.trim().toLowerCase() && u.clave === datos.clave);
      return usuario
        ? respuesta(200, { token: tokenFalso(usuario), usuario: publico(usuario) })
        : error(401, 'Correo o contraseña incorrectos. Revisa tus datos.');
    }],
    ['POST', '/auth/registro', ({ datos }) => guardarUsuario(null, { ...datos, tipo: 'Cliente' })],
    ['PUT', '/usuarios/me', ({ usuario, datos }) => exigir(usuario) ?? guardarUsuario(usuario.id, { ...datos, tipo: usuario.tipo })],
    ['GET', '/usuarios', ({ usuario }) => exigir(usuario, ADMIN) ?? respuesta(200, db.usuarios.map(publico))],
    ['POST', '/usuarios', ({ usuario, datos }) => exigir(usuario, ADMIN) ?? guardarUsuario(null, datos)],
    ['PUT', '/usuarios/:id', ({ usuario, id, datos }) => exigir(usuario, ADMIN) ?? guardarUsuario(id, datos)],
    ['DELETE', '/usuarios/:id', ({ usuario, id }) => {
      if (exigir(usuario, ADMIN)) return exigir(usuario, ADMIN);
      if (id === usuario.id) return error(409, 'No puedes eliminar tu propia cuenta mientras la estás usando.');
      db.usuarios = db.usuarios.filter((u) => u.id !== id);
      return respuesta(204);
    }],
    ['GET', '/productos', () => respuesta(200, db.productos.map(conCategoria))],
    ['POST', '/productos', ({ usuario, datos }) => exigir(usuario, ADMIN) ?? guardarProducto(null, datos)],
    ['PUT', '/productos/:id', ({ usuario, id, datos }) => exigir(usuario, ADMIN) ?? guardarProducto(id, datos)],
    ['DELETE', '/productos/:id', ({ usuario, id }) => {
      if (exigir(usuario, ADMIN)) return exigir(usuario, ADMIN);
      db.productos = db.productos.filter((p) => p.id !== id);
      return respuesta(204);
    }],
    ['GET', '/categorias', () => respuesta(200, db.categorias)],
    ['POST', '/categorias', ({ usuario, datos }) => exigir(usuario, ADMIN) ?? guardarCategoria(null, datos)],
    ['PUT', '/categorias/:id', ({ usuario, id, datos }) => exigir(usuario, ADMIN) ?? guardarCategoria(id, datos)],
    ['DELETE', '/categorias/:id', ({ usuario, id }) => exigir(usuario, ADMIN) ?? eliminarCategoria(id)],
    ['GET', '/boletas', ({ usuario }) =>
      exigir(usuario, PANEL) ?? respuesta(200, [...db.boletas].sort((a, b) => b.numero - a.numero))],
    ['POST', '/boletas', ({ usuario, datos }) => comprar(datos, usuario)],
    ['GET', '/cupones/:codigo', ({ param }) => {
      const cupon = CUPONES.find((c) => c.codigo === param);
      return cupon ? respuesta(200, cupon) : error(404, `El cupón "${param}" no existe.`);
    }],
  ].map(([metodo, ruta, manejar]) => [metodo, new RegExp(`^${ruta.replace(/:\w+/, '([^/]+)')}$`), manejar]);

  const fetch = vi.fn(async (url, { method = 'GET', headers, body } = {}) => {
    if (db.caido) throw new TypeError('Failed to fetch');
    const ruta = decodeURIComponent(new URL(url).pathname.replace('/api/v1', ''));
    // Como el gateway: un token falso o vencido se rechaza en cualquier ruta
    const usuario = usuarioDel(headers);
    if (usuario === 'invalido') return respuesta(401);
    for (const [metodo, patron, manejar] of rutas) {
      const coincide = metodo === method && patron.exec(ruta);
      if (coincide)
        return manejar({ usuario, datos: body && JSON.parse(body), param: coincide[1], id: Number(coincide[1]) });
    }
    return error(404, `Ruta no simulada: ${method} ${ruta}`);
  });

  return { db, fetch };
}
