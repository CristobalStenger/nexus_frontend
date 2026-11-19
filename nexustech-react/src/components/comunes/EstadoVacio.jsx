// Mensaje que se muestra cuando una lista no tiene elementos.
// esPagina: el aviso ocupa toda la página (no existe, sin permiso...), así que su título es el h1.
export default function EstadoVacio({ icono = 'bi-search', titulo, esPagina = false, children }) {
  const Titulo = esPagina ? 'h1' : 'p';
  return (
    <div className="caja-vidrio text-center p-5">
      <i className={`bi ${icono} fs-1`} aria-hidden="true"></i>
      {/* fs-6 y lh-base hacen que el h1 se vea igual que el párrafo */}
      <Titulo className="mt-3 mb-2 fw-bold fs-6 lh-base">{titulo}</Titulo>
      {children}
    </div>
  );
}
