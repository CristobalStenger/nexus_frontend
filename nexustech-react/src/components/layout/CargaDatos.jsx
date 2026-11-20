import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';
import { useTienda } from '../../hooks/useTienda.js';
import { useAuth } from '../../hooks/useAuth.js';
import { esAdministrador, puedeVerPanel } from '../../store/authReducer.js';

// Espera los datos del backend que necesita la sesión actual: el catálogo siempre,
// las órdenes para el panel y los usuarios para el administrador.
export default function CargaDatos({ children }) {
  const { estado, reintentarCarga } = useTienda();
  const { sesion, usuariosListos } = useAuth();

  if (estado.errorCarga)
    return (
      <main className="container py-5 text-center">
        <Alert variant="danger">
          <i className="bi bi-wifi-off me-2" aria-hidden="true"></i>
          {estado.errorCarga}
        </Alert>
        <Button variant="nexus" onClick={reintentarCarga}>
          Reintentar
        </Button>
      </main>
    );

  const esperando =
    !estado.catalogoListo ||
    (puedeVerPanel(sesion) && !estado.ordenesListas) ||
    (esAdministrador(sesion) && !usuariosListos);
  if (esperando)
    return (
      <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center gap-3" role="status">
        <Spinner animation="border" aria-hidden="true" />
        <p className="mb-0">Conectando con NexusTech…</p>
        {/* En la nube un servicio sin uso se apaga y tarda unos segundos en despertar */}
        <small className="text-muted">La primera carga puede tardar unos segundos.</small>
      </div>
    );

  return children;
}
