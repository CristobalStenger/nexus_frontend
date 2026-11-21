import { describe, expect, it } from 'vitest';
import { actualizar, crear, eliminar, obtener } from '../../src/services/crud.js';

const lista = [
  { id: 1, nombre: 'A' },
  { id: 4, nombre: 'B' },
];

describe('CRUD genérico', () => {
  it('obtiene por clave y responde null si no existe', () => {
    expect(obtener(lista, 4)).toEqual({ id: 4, nombre: 'B' });
    expect(obtener(lista, 'B', 'nombre').id).toBe(4);
    expect(obtener(lista, 99)).toBeNull();
  });

  it('crea, actualiza y elimina sin mutar el arreglo original', () => {
    const creada = crear(lista, { id: 5, nombre: 'C' });
    const actualizada = actualizar(creada, 5, { nombre: 'Z' });
    const eliminada = eliminar(actualizada, 1);
    expect(creada).toHaveLength(3);
    expect(actualizada[2]).toEqual({ id: 5, nombre: 'Z' });
    expect(eliminada.map((e) => e.id)).toEqual([4, 5]);
    expect(lista).toHaveLength(2);
  });
});
