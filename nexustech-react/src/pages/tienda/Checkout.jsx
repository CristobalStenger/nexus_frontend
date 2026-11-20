import { startTransition, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';
import EstadoVacio from '../../components/comunes/EstadoVacio.jsx';
import CampoFormulario from '../../components/formularios/CampoFormulario.jsx';
import SelectorRegionComuna from '../../components/formularios/SelectorRegionComuna.jsx';
import TablaItemsCompra from '../../components/compra/TablaItemsCompra.jsx';
import ResumenCompra from '../../components/compra/ResumenCompra.jsx';
import { OPCIONES_ENTREGA, SUFIJO_TARJETA_RECHAZADA } from '../../data/configuracion.js';
import { obtener } from '../../services/crud.js';
import { detalleCarrito, resumenCarrito } from '../../store/tiendaReducer.js';
import { precioCLP } from '../../utils/formatos.js';
import { validarCheckout, validarTarjeta } from '../../utils/validaciones.js';
import { useFormulario } from '../../hooks/useFormulario.js';
import { useTienda } from '../../hooks/useTienda.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useTitulo } from '../../hooks/useTitulo.js';

const VACIO = {
  nombre: '',
  apellidos: '',
  correo: '',
  calle: '',
  departamento: '',
  region: '',
  comuna: '',
  indicaciones: '',
  entrega: 'despacho',
  numeroTarjeta: '',
  titular: '',
  vencimiento: '',
  cvv: '',
};

// Datos iniciales: los de un pago rechazado que se reintenta,
// o los del usuario con sesión iniciada (se completan solos).
function datosIniciales(ordenAnterior, sesion) {
  if (ordenAnterior) {
    const { cliente, entrega } = ordenAnterior;
    return { ...VACIO, ...cliente, ...entrega, entrega: entrega.tipo };
  }
  if (sesion)
    return {
      ...VACIO,
      nombre: sesion.nombre,
      apellidos: sesion.apellidos,
      correo: sesion.correo,
      calle: sesion.direccion,
      region: sesion.region,
      comuna: sesion.comuna,
    };
  return VACIO;
}

const validar = (valores) => ({ ...validarCheckout(valores), ...validarTarjeta(valores) });

export default function Checkout() {
  useTitulo('Checkout');
  const { estado, pagar, registrarCompra } = useTienda();
  const { sesion } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();
  const ordenAnterior = state?.reintentoDe ? obtener(estado.ordenes, state.reintentoDe, 'numero') : null;
  const form = useFormulario(datosIniciales(ordenAnterior, sesion), validar);
  const { valores, cambiar } = form;
  // Evita un segundo pago mientras el backend responde (en la nube puede tardar unos segundos)
  const [pagando, setPagando] = useState(false);

  const detalle = detalleCarrito(estado);
  const resumen = resumenCarrito(estado, valores.entrega);
  const stockCambio = detalle.some((p) => p.cantidad > p.stock);

  if (!detalle.length)
    return (
      <EstadoVacio esPagina icono="bi-cart-x" titulo="No hay productos para pagar.">
        <Link to="/productos" className="btn btn-nexus">
          Ir al catálogo
        </Link>
      </EstadoVacio>
    );

  // pedido-service decide si el pago se aprueba o se rechaza y devuelve la boleta.
  // El RUN del comprador lo toma del token, no de este formulario.
  const enviarPago = form.enviar(async (v) => {
    setPagando(true);
    const resultado = await pagar({
      cliente: {
        nombre: v.nombre.trim(),
        apellidos: v.apellidos.trim(),
        correo: v.correo.trim().toLowerCase(),
      },
      entrega: {
        tipo: v.entrega,
        calle: v.calle.trim(),
        departamento: v.departamento.trim(),
        region: v.region,
        comuna: v.comuna,
        indicaciones: v.indicaciones.trim(),
      },
      pago: {
        numeroTarjeta: v.numeroTarjeta.trim(),
        titular: v.titular.trim(),
        vencimiento: v.vencimiento.trim(),
        cvv: v.cvv.trim(),
      },
    });
    if (!resultado.ok) {
      setPagando(false);
      return;
    }
    const { orden } = resultado;
    // Registrar la compra y navegar en la misma transición: si no, se alcanza a ver el checkout con el carrito vacío
    startTransition(() => {
      registrarCompra(orden);
      navigate(`/compra/${orden.estado === 'pagada' ? 'exitosa' : 'error'}/${orden.numero}`);
    });
  });

  const campo = (nombre) => ({ ...form.campo(nombre), id: `checkout-${nombre}`, className: '' });

  return (
    <Row className="justify-content-center">
      <Col xs={12} lg={10} xl={9}>
        <div className="caja-sesion">
          <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
            <div>
              <h1 className="h3 fw-bold mb-0">Carrito de compra</h1>
              <p className="mb-0 small">Completa la siguiente información</p>
            </div>
            <span className="total-pagar">Total a pagar: {precioCLP(resumen.total)}</span>
          </div>

          {ordenAnterior && (
            <Alert variant="info">Reintentando el pago de la orden #{ordenAnterior.numero}.</Alert>
          )}
          {stockCambio && (
            <Alert variant="warning">
              Algunos productos ya no tienen stock suficiente. El pago será rechazado;{' '}
              <Link to="/carrito">revisa tu carrito</Link>.
            </Alert>
          )}

          <TablaItemsCompra
            items={detalle.map((p) => ({ ...p, precio: p.precioUnitario }))}
          />

          <Form noValidate onSubmit={enviarPago} className="mt-4">
            <h2 className="h4 fw-bold">Información del cliente</h2>
            <p className="small">
              {sesion ? 'Datos completados desde tu cuenta.' : 'Completa la siguiente información.'}
            </p>
            <Row className="g-3 mb-4">
              <Col md={6}>
                <CampoFormulario {...campo('nombre')} etiqueta="Nombre" maxLength={50} autoComplete="given-name" />
              </Col>
              <Col md={6}>
                <CampoFormulario {...campo('apellidos')} etiqueta="Apellidos" maxLength={100} autoComplete="family-name" />
              </Col>
              <Col md={6}>
                <CampoFormulario {...campo('correo')} etiqueta="Correo" type="email" maxLength={100} autoComplete="email" />
              </Col>
            </Row>

            <h2 className="h4 fw-bold">Dirección de entrega de los productos</h2>
            <p className="small">Ingresa la dirección de forma detallada.</p>
            <Row className="g-3 mb-3">
              <Col md={6}>
                <CampoFormulario {...campo('calle')} etiqueta="Calle" maxLength={300} autoComplete="address-line1" />
              </Col>
              <Col md={6}>
                <CampoFormulario {...campo('departamento')} etiqueta="Departamento (opcional)" placeholder="Ej: 603" maxLength={50} />
              </Col>
            </Row>
            <SelectorRegionComuna
              prefijo="checkout"
              region={valores.region}
              comuna={valores.comuna}
              errores={{ region: form.error('region'), comuna: form.error('comuna') }}
              validos={{ region: form.valido('region'), comuna: form.valido('comuna') }}
              onCambio={form.actualizar}
            />
            <CampoFormulario
              {...campo('indicaciones')}
              className="mt-3"
              etiqueta="Indicaciones para la entrega (opcional)"
              as="textarea"
              rows={2}
              maxLength={300}
              placeholder="Ej: Entre calles, color del edificio, no tiene timbre."
            />

            <fieldset className="mt-4">
              <legend className="h4 fw-bold">Opción de entrega</legend>
              {OPCIONES_ENTREGA.map((opcion) => (
                <Form.Check
                  key={opcion.valor}
                  type="radio"
                  id={`entrega-${opcion.valor}`}
                  name="entrega"
                  value={opcion.valor}
                  checked={valores.entrega === opcion.valor}
                  onChange={cambiar}
                  label={`${opcion.texto} — ${opcion.costo ? precioCLP(opcion.costo) : 'Gratis'}`}
                />
              ))}
            </fieldset>

            <h2 className="h4 fw-bold mt-4">Pago con tarjeta</h2>
            <p className="small text-muted">
              Pago simulado: usa cualquier número de 16 dígitos. Las tarjetas terminadas en{' '}
              {SUFIJO_TARJETA_RECHAZADA} son rechazadas.
            </p>
            <Row className="g-3">
              <Col md={6}>
                <CampoFormulario
                  {...campo('numeroTarjeta')}
                  etiqueta="Número de tarjeta"
                  inputMode="numeric"
                  maxLength={19}
                  placeholder="4242 4242 4242 4242"
                  autoComplete="cc-number"
                />
              </Col>
              <Col md={6}>
                <CampoFormulario {...campo('titular')} etiqueta="Titular" maxLength={100} autoComplete="cc-name" />
              </Col>
              <Col xs={6} md={3}>
                <CampoFormulario {...campo('vencimiento')} etiqueta="Vencimiento" placeholder="MM/AA" maxLength={5} autoComplete="cc-exp" />
              </Col>
              <Col xs={6} md={3}>
                <CampoFormulario {...campo('cvv')} etiqueta="CVV" inputMode="numeric" maxLength={4} autoComplete="cc-csc" />
              </Col>
            </Row>

            <div className="caja-vidrio p-3 mt-4">
              <ResumenCompra {...resumen} cupon={estado.cupon} textoTotal="Total a pagar" />
            </div>

            <div className="d-flex justify-content-between flex-wrap gap-2 mt-4">
              <Link to="/carrito" className="btn btn-nexus-claro">
                <i className="bi bi-arrow-left me-1" aria-hidden="true"></i> Volver al carrito
              </Link>
              <Button type="submit" variant="success" className="px-4" disabled={pagando}>
                {pagando ? 'Procesando el pago…' : `Pagar ahora ${precioCLP(resumen.total)}`}
              </Button>
            </div>
          </Form>
        </div>
      </Col>
    </Row>
  );
}
