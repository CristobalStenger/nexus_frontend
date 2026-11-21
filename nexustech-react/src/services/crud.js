// ============================================================
// NexusTech - Operaciones CRUD genéricas sobre colecciones
// Funciones puras: reciben un arreglo y devuelven uno nuevo,
// sin modificar el original. Las usan los reducers para
// crear, leer, actualizar y eliminar productos, categorías,
// usuarios y órdenes.
// ============================================================

// Leer: un elemento por su clave (id por defecto)
export const obtener = (coleccion, valor, campo = 'id') =>
  coleccion.find((elemento) => elemento[campo] === valor) ?? null;

// Crear: agrega al final
export const crear = (coleccion, elemento) => [...coleccion, elemento];

// Actualizar: mezcla los cambios conservando la clave original
export const actualizar = (coleccion, valor, cambios, campo = 'id') =>
  coleccion.map((elemento) =>
    elemento[campo] === valor ? { ...elemento, ...cambios } : elemento,
  );

// Eliminar: deja fuera el elemento indicado
export const eliminar = (coleccion, valor, campo = 'id') =>
  coleccion.filter((elemento) => elemento[campo] !== valor);
