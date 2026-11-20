import { useCallback, useEffect, useReducer, useState } from 'react';
import { AuthContext } from './contextos.js';
import { api, aUsuario } from '../services/api.js';
import { cargarSesion, crearSesion, guardarSesion } from '../services/persistencia.js';
import { authReducer, crearEstadoAuth, esAdministrador } from '../store/authReducer.js';
import { convertirUsuario } from '../utils/validaciones.js';

// Sesión (login con JWT) y gestión de usuarios contra usuario-service.
// Los formularios ya validaron los datos; el backend los vuelve a validar.
export function AuthProvider({ children }) {
  const [estado, dispatch] = useReducer(authReducer, undefined, () => crearEstadoAuth(cargarSesion()));
  const [errorGuardado, setErrorGuardado] = useState(false);
  const { usuarios, sesion } = estado;
  const token = sesion?.token;
  const admin = esAdministrador(sesion);

  useEffect(() => {
    setErrorGuardado(!guardarSesion(sesion));
  }, [sesion]);

  // Un 401 con sesión abierta significa que el token venció o ya no es válido
  const expirarSesion = useCallback(() => dispatch({ type: 'EXPIRADA' }), []);

  function fallo(error) {
    if (error.status === 401 && sesion) expirarSesion();
    else dispatch({ type: 'AVISO', texto: error.message, tipo: 'danger' });
    return { ok: false, error };
  }

  // El administrador trabaja con la lista de usuarios (panel, dashboard y RUN/correo repetidos)
  useEffect(() => {
    if (!admin) return undefined;
    let vigente = true;
    api('/usuarios', { token })
      .then((lista) => vigente && dispatch({ type: 'USUARIOS', usuarios: lista.map(aUsuario) }))
      .catch((error) => {
        if (!vigente) return;
        dispatch({ type: 'USUARIOS', usuarios: [] });
        if (error.status === 401) expirarSesion();
        else dispatch({ type: 'AVISO', texto: error.message, tipo: 'danger' });
      });
    return () => {
      vigente = false;
    };
  }, [admin, token, expirarSesion]);

  async function ingresar(correo, clave) {
    try {
      const respuesta = await api('/auth/login', { metodo: 'POST', datos: { correo, clave } });
      const nueva = crearSesion(aUsuario(respuesta.usuario), respuesta.token);
      dispatch({ type: 'INGRESAR', sesion: nueva });
      return { ok: true, usuario: nueva };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }

  // Registro desde la tienda: el backend siempre lo crea como Cliente
  async function registrar(datos) {
    try {
      await api('/auth/registro', { metodo: 'POST', datos: convertirUsuario(datos) });
      return { ok: true };
    } catch (error) {
      return fallo(error);
    }
  }

  // runOriginal null: el administrador crea una cuenta.
  // La cuenta propia se edita en /usuarios/me, donde el rol no cambia.
  async function guardarUsuario(datos, runOriginal = null) {
    const nuevo = runOriginal === null;
    const ruta = nuevo
      ? '/usuarios'
      : runOriginal === sesion?.run
        ? '/usuarios/me'
        : `/usuarios/${usuarios.find((u) => u.run === runOriginal)?.id}`;
    try {
      const respuesta = await api(ruta, { metodo: nuevo ? 'POST' : 'PUT', datos: convertirUsuario(datos), token });
      const usuario = aUsuario(respuesta);
      dispatch({ type: 'USUARIO_GUARDADO', usuario, nuevo });
      return { ok: true, usuario };
    } catch (error) {
      return fallo(error);
    }
  }

  async function eliminarUsuario(run) {
    const usuario = usuarios.find((u) => u.run === run);
    try {
      await api(`/usuarios/${usuario.id}`, { metodo: 'DELETE', token });
      dispatch({ type: 'USUARIO_ELIMINADO', id: usuario.id });
      return { ok: true };
    } catch (error) {
      return fallo(error);
    }
  }

  const valor = {
    usuarios,
    usuariosListos: estado.usuariosListos,
    sesion,
    aviso: estado.aviso,
    errorGuardado,
    ingresar,
    registrar,
    guardarUsuario,
    eliminarUsuario,
    expirarSesion,
    cerrarSesion: () => dispatch({ type: 'SALIR' }),
    cerrarAviso: () => dispatch({ type: 'CERRAR_AVISO' }),
  };

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}
