import { afterEach, describe, expect, it, vi } from 'vitest';
import { API_URL, ErrorApi, aOrden, aUsuario, api } from '../../src/services/api.js';

const responder = (status, cuerpo) => vi.fn(async () => ({ ok: status < 400, status, json: async () => cuerpo }));

afterEach(() => vi.unstubAllGlobals());

describe('api: comunicación REST con el gateway', () => {
  it('arma la URL versionada y envía JSON con el token', async () => {
    const fetch = responder(201, { id: 41 });
    vi.stubGlobal('fetch', fetch);
    await expect(api('/productos', { metodo: 'POST', datos: { codigo: 'X' }, token: 'abc' })).resolves.toEqual({ id: 41 });
    expect(API_URL).toBe('http://localhost:8080');
    expect(fetch).toHaveBeenCalledWith('http://localhost:8080/api/v1/productos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer abc' },
      body: '{"codigo":"X"}',
    });
  });

  it('un GET sin sesión no envía cuerpo ni token', async () => {
    const fetch = responder(200, []);
    vi.stubGlobal('fetch', fetch);
    await api('/categorias');
    expect(fetch).toHaveBeenCalledWith('http://localhost:8080/api/v1/categorias', { method: 'GET', headers: {}, body: undefined });
  });

  it('204 (eliminar) devuelve null sin leer el cuerpo', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 204, json: () => Promise.reject(new Error('sin cuerpo')) })));
    await expect(api('/productos/1', { metodo: 'DELETE', token: 'abc' })).resolves.toBeNull();
  });

  it('convierte los errores del backend (ProblemDetail) en ErrorApi', async () => {
    vi.stubGlobal('fetch', responder(409, { status: 409, detail: 'Ya existe un producto con ese código.' }));
    await expect(api('/productos', { metodo: 'POST', datos: {} })).rejects.toMatchObject({
      status: 409,
      message: 'Ya existe un producto con ese código.',
    });
  });

  it('con errores de validación muestra el mensaje de cada campo', async () => {
    vi.stubGlobal('fetch', responder(400, { detail: 'Revisa los datos enviados.', errores: { precio: 'El precio no puede ser negativo.' } }));
    const error = await api('/productos', { metodo: 'POST', datos: {} }).catch((e) => e);
    expect(error).toBeInstanceOf(ErrorApi);
    expect(error.message).toBe('El precio no puede ser negativo.');
    expect(error.errores).toEqual({ precio: 'El precio no puede ser negativo.' });
  });

  it('401 y 403 sin cuerpo (Spring Security) tienen un mensaje claro', async () => {
    vi.stubGlobal('fetch', responder(401, null));
    await expect(api('/boletas')).rejects.toMatchObject({ status: 401, message: 'Tu sesión expiró. Inicia sesión nuevamente.' });
    vi.stubGlobal('fetch', responder(403, null));
    await expect(api('/usuarios')).rejects.toMatchObject({ status: 403, message: 'No tienes permiso para realizar esta acción.' });
  });

  it('un 5xx sin detalle (servicio despertando) pide intentar de nuevo', async () => {
    vi.stubGlobal('fetch', responder(504, { status: 504, error: 'Gateway Timeout' }));
    await expect(api('/productos')).rejects.toMatchObject({
      status: 504,
      message: 'El servidor no pudo responder. Inténtalo nuevamente en unos segundos.',
    });
    vi.stubGlobal('fetch', responder(418, null));
    await expect(api('/productos')).rejects.toMatchObject({ message: 'No se pudo completar la solicitud (error 418).' });
  });

  it('si no hay conexión responde con estado 0', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))));
    await expect(api('/productos')).rejects.toMatchObject({ status: 0, message: expect.stringMatching(/No se pudo conectar/) });
  });
});

describe('adaptadores del JSON del backend', () => {
  it('las líneas de la boleta usan id como en el carrito', () => {
    const orden = aOrden({ numero: 1, items: [{ productoId: 7, nombre: 'GPU', cantidad: 1 }] });
    expect(orden.items).toEqual([{ id: 7, nombre: 'GPU', cantidad: 1 }]);
  });

  it('una fecha de nacimiento null queda como texto vacío para el formulario', () => {
    expect(aUsuario({ id: 1, fechaNacimiento: null }).fechaNacimiento).toBe('');
    expect(aUsuario({ id: 1, fechaNacimiento: '2002-09-30' }).fechaNacimiento).toBe('2002-09-30');
  });
});
