import { useCallback, useEffect, useReducer, useState } from 'react';
import { TiendaContext } from './contextos.js';
import { api, aOrden } from '../services/api.js';
import { cargarTienda, guardarTienda } from '../services/persistencia.js';
import { crearEstado, tiendaReducer } from '../store/tiendaReducer.js';
import { puedeVerPanel } from '../store/authReducer.js';
import { convertirProducto } from '../utils/validaciones.js';
import { useAuth } from '../hooks/useAuth.js';

// Comparte el estado de la tienda. Productos, categorías y órdenes vienen del
// backend (producto-service y pedido-service); el carrito y el cupón se guardan
// en localStorage. Cada función devuelve { ok } para que la página sepa si seguir.
export function TiendaProvider({ children }) {
  const { sesion, expirarSesion } = useAuth();
  const [estado, dispatch] = useReducer(tiendaReducer, undefined, () => crearEstado(cargarTienda()));
  const [errorGuardado, setErrorGuardado] = useState(false);
  const { carrito, cupon } = estado;
  const token = sesion?.token;
  const panel = puedeVerPanel(sesion);

  useEffect(() => {
    setErrorGuardado(!guardarTienda({ carrito, cupon }));
  }, [carrito, cupon]);

  // Catálogo público: lo usan la tienda y el panel
  const cargarCatalogo = useCallback(async () => {
    try {
      const [productos, categorias] = await Promise.all([api('/productos'), api('/categorias')]);
      dispatch({ type: 'CATALOGO', productos, categorias });
    } catch (error) {
      dispatch({ type: 'ERROR_CARGA', texto: error.message });
    }
  }, []);

  useEffect(() => {
    cargarCatalogo();
  }, [cargarCatalogo]);

  // Las órdenes solo las ven el administrador y el vendedor
  useEffect(() => {
    if (!panel) {
      dispatch({ type: 'SIN_ORDENES' });
      return undefined;
    }
    let vigente = true;
    api('/boletas', { token })
      .then((ordenes) => vigente && dispatch({ type: 'ORDENES', ordenes: ordenes.map(aOrden) }))
      .catch((error) => {
        if (!vigente) return;
        dispatch({ type: 'ORDENES', ordenes: [] });
        if (error.status === 401) expirarSesion();
        else dispatch({ type: 'AVISO', texto: error.message, tipo: 'danger' });
      });
    return () => {
      vigente = false;
    };
  }, [panel, token, expirarSesion]);

  function fallo(error) {
    if (error.status === 401 && sesion) expirarSesion();
    else dispatch({ type: 'AVISO', texto: error.message, tipo: 'danger' });
    return { ok: false, error };
  }

  // id null: producto nuevo. El formulario trabaja con el nombre de la categoría; el backend, con su id.
  async function guardarProducto(datos, id = null) {
    const categoriaId = estado.categorias.find((c) => c.nombre === datos.categoria)?.id;
    try {
      const producto = await api(id === null ? '/productos' : `/productos/${id}`, {
        metodo: id === null ? 'POST' : 'PUT',
        datos: { ...convertirProducto(datos), categoriaId },
        token,
      });
      dispatch({ type: 'PRODUCTO_GUARDADO', producto, nuevo: id === null });
      return { ok: true, producto };
    } catch (error) {
      return fallo(error);
    }
  }

  async function eliminarProducto(id) {
    try {
      await api(`/productos/${id}`, { metodo: 'DELETE', token });
      dispatch({ type: 'PRODUCTO_ELIMINADO', id });
      return { ok: true };
    } catch (error) {
      return fallo(error);
    }
  }

  async function guardarCategoria({ nombre, icono, descripcion }, id = null) {
    try {
      const categoria = await api(id === null ? '/categorias' : `/categorias/${id}`, {
        metodo: id === null ? 'POST' : 'PUT',
        datos: { nombre, icono, descripcion },
        token,
      });
      dispatch({ type: 'CATEGORIA_GUARDADA', categoria, nuevo: id === null });
      return { ok: true, categoria };
    } catch (error) {
      return fallo(error);
    }
  }

  async function eliminarCategoria(id) {
    try {
      await api(`/categorias/${id}`, { metodo: 'DELETE', token });
      dispatch({ type: 'CATEGORIA_ELIMINADA', id });
      return { ok: true };
    } catch (error) {
      return fallo(error);
    }
  }

  // El error se muestra junto al campo del cupón, no como aviso emergente
  async function aplicarCupon(codigo) {
    const escrito = codigo.trim().toUpperCase();
    if (!escrito) return { error: 'Escribe un código de descuento.' };
    if (!estado.carrito.length) return { error: 'Agrega productos antes de usar un cupón.' };
    try {
      dispatch({ type: 'APLICAR_CUPON', cupon: await api(`/cupones/${encodeURIComponent(escrito)}`) });
      return {};
    } catch (error) {
      return { error: error.message };
    }
  }

  // Solo se envían el carrito y los datos del formulario: precios, stock,
  // cupón y totales los calcula pedido-service. Devuelve la boleta creada.
  async function pagar({ cliente, entrega, pago }) {
    try {
      const orden = aOrden(
        await api('/boletas', {
          metodo: 'POST',
          datos: {
            cliente,
            entrega,
            pago,
            cupon: estado.cupon?.codigo ?? null,
            items: estado.carrito.map((item) => ({ productoId: item.id, cantidad: item.cantidad })),
          },
          token,
        }),
      );
      return { ok: true, orden };
    } catch (error) {
      return fallo(error);
    }
  }

  const valor = {
    estado,
    dispatch,
    errorGuardado,
    guardarProducto,
    eliminarProducto,
    guardarCategoria,
    eliminarCategoria,
    aplicarCupon,
    pagar,
    // La página llama a esta función junto con navigate, en la misma transición
    registrarCompra: (orden) => dispatch({ type: 'COMPRA', orden }),
    reintentarCarga: () => {
      dispatch({ type: 'ERROR_CARGA', texto: '' });
      cargarCatalogo();
    },
  };

  return <TiendaContext.Provider value={valor}>{children}</TiendaContext.Provider>;
}
