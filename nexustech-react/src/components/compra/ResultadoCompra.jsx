import TablaItemsCompra from './TablaItemsCompra.jsx';
import DatosOrden from './DatosOrden.jsx';
import ResumenCompra from './ResumenCompra.jsx';
import { formatearFecha } from '../../utils/formatos.js';

// Estructura común de las vistas "compra exitosa", "pago con error" y boleta.
// etiquetaTitulo="h2" cuando la página ya tiene su propio h1 (boleta del panel).
export default function ResultadoCompra({ orden, icono, claseIcono, titulo, etiquetaTitulo = 'h1', subtitulo, acciones, children }) {
  const Titulo = etiquetaTitulo;
  return (
    <div className="caja-sesion">
      <div className="d-flex justify-content-between flex-wrap gap-2">
        <Titulo className="h3 fw-bold d-flex align-items-center gap-2">
          <i className={`bi ${icono} icono-resultado ${claseIcono}`} aria-hidden="true"></i>
          {titulo} nro #{orden.numero}
        </Titulo>
        <small className="text-muted">
          Código orden: {orden.codigo}
          <br />
          {formatearFecha(orden.fecha)}
        </small>
      </div>
      {subtitulo && <p className="small">{subtitulo}</p>}
      {children}
      <DatosOrden orden={orden} />
      <TablaItemsCompra items={orden.items} />
      <div className="caja-vidrio p-3 mt-3">
        <ResumenCompra
          subtotal={orden.subtotal}
          descuento={orden.descuento}
          envio={orden.envio}
          total={orden.total}
          cupon={orden.cupon}
          textoTotal={orden.estado === 'pagada' ? 'Total pagado' : 'Total'}
        />
      </div>
      {acciones && <div className="d-flex justify-content-center flex-wrap gap-2 mt-4 no-imprimir">{acciones}</div>}
    </div>
  );
}
