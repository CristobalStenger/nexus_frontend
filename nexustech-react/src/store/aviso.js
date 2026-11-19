// Agrega al estado el aviso emergente (Toast) que muestra AvisosGlobales.
// El id cambia en cada aviso para que React lo trate como uno nuevo.
export function conAviso(estado, texto, tipo = 'success') {
  return { ...estado, aviso: { texto, tipo, id: (estado.aviso?.id ?? 0) + 1 } };
}
