import { useNavigate } from 'react-router';
import EncabezadoAdmin from '../../../components/admin/EncabezadoAdmin.jsx';
import ProductoForm from '../../../components/formularios/ProductoForm.jsx';
import { useTienda } from '../../../hooks/useTienda.js';
import { useTitulo } from '../../../hooks/useTitulo.js';

export default function NuevoProducto() {
  useTitulo('Nuevo producto');
  const { estado, guardarProducto } = useTienda();
  const navigate = useNavigate();

  async function guardar(datos) {
    if ((await guardarProducto(datos)).ok) navigate('/admin/productos');
  }

  return (
    <>
      <EncabezadoAdmin titulo="Nuevo producto">Completa los datos para agregarlo al catálogo.</EncabezadoAdmin>
      <section className="caja-sesion">
        <ProductoForm
          productos={estado.productos}
          categorias={estado.categorias}
          onGuardar={guardar}
          onCancelar={() => navigate('/admin/productos')}
        />
      </section>
    </>
  );
}
