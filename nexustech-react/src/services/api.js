// ============================================================
// NexusTech - Comunicación REST con el backend (API Gateway)
// Todas las llamadas pasan por aquí: arman la URL /api/v1/...,
// envían el token JWT y convierten los errores en ErrorApi.
// ============================================================

// En Vercel se define VITE_API_URL con la URL del gateway; en local, el gateway corre en el puerto 8080
export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/+$/, '');

const MENSAJES = {
  401: 'Tu sesión expiró. Inicia sesión nuevamente.',
  403: 'No tienes permiso para realizar esta acción.',
};

export class ErrorApi extends Error {
  constructor(status, mensaje, errores = {}) {
    super(mensaje);
    this.status = status; // 0: no se pudo conectar
    this.errores = errores; // validación del backend: { campo: mensaje }
  }
}

// api('/productos'), api('/boletas', { metodo: 'POST', datos, token })
export async function api(ruta, { metodo = 'GET', datos, token } = {}) {
  const headers = {};
  if (datos !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let respuesta;
  try {
    respuesta = await fetch(`${API_URL}/api/v1${ruta}`, {
      method: metodo,
      headers,
      body: datos === undefined ? undefined : JSON.stringify(datos),
    });
  } catch {
    throw new ErrorApi(0, 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo nuevamente.');
  }

  // 204 (eliminar) no trae cuerpo. Los errores llegan como JSON { detail, errores }.
  const cuerpo = respuesta.status === 204 ? null : await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    const errores = cuerpo?.errores ?? {};
    const mensaje = Object.values(errores).join(' ') || cuerpo?.detail || MENSAJES[respuesta.status];
    // Un 5xx sin detalle suele ser un servicio que aún despierta o se demoró (el gateway responde 502/504)
    const porDefecto =
      respuesta.status >= 500
        ? 'El servidor no pudo responder. Inténtalo nuevamente en unos segundos.'
        : `No se pudo completar la solicitud (error ${respuesta.status}).`;
    throw new ErrorApi(respuesta.status, mensaje || porDefecto, errores);
  }
  return cuerpo;
}

// ---------- Del JSON del backend al formato que usan las vistas ----------

// En la boleta, cada línea trae "productoId"; las vistas usan "id" como en el carrito
export const aOrden = (boleta) => ({
  ...boleta,
  items: boleta.items.map(({ productoId, ...item }) => ({ id: productoId, ...item })),
});

// Los formularios trabajan con texto: una fecha de nacimiento vacía llega como null
export const aUsuario = (usuario) => ({ ...usuario, fechaNacimiento: usuario.fechaNacimiento ?? '' });
