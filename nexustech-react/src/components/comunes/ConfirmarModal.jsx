import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';

// Confirmación reutilizable. Se abre con la prop "abierto";
// onConfirmar y onCancelar son funciones que entrega el padre.
export default function ConfirmarModal({
  abierto,
  titulo,
  children,
  textoConfirmar = 'Confirmar',
  variante = 'danger',
  onConfirmar,
  onCancelar,
}) {
  return (
    <Modal show={abierto} onHide={onCancelar} centered aria-labelledby="titulo-confirmar">
      <Modal.Header closeButton>
        <Modal.Title id="titulo-confirmar">{titulo}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{children}</Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button variant={variante} onClick={onConfirmar}>
          {textoConfirmar}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
