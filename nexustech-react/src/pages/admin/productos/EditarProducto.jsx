import { Link, useNavigate, useParams } from 'react-router';
import EncabezadoAdmin from '../../../components/admin/EncabezadoAdmin.jsx';
import EstadoVacio from '../../../components/comunes/EstadoVacio.jsx';
import ProductoForm from '../../../components/formularios/ProductoForm.jsx';
import { obtener } from '../../../services/crud.js';
import { useTienda } from '../../../hooks/useTienda.js';
import { useTitulo } from '../../../hooks/useTitulo.js';

export default function EditarProducto() {
  useTitulo('Editar producto');
  const { id } = useParams();
  const { estado, guardarProducto } = useTienda();
  const navigate = useNavigate();
  const producto = obtener(estado.productos, Number(id));

  if (!producto)
    return (
      <EstadoVacio esPagina icono="bi-box-seam" titulo="El producto no existe.">
        <Link to="/admin/productos" className="btn btn-nexus">Volver a productos</Link>
      </EstadoVacio>
    );

  async function guardar(datos) {
    if ((await guardarProducto(datos, producto.id)).ok) navigate(`/admin/productos/${producto.id}`);
  }

  return (
    <>
      <EncabezadoAdmin titulo={`Editar producto: ${producto.nombre}`}>El id {producto.id} se conserva al guardar.</EncabezadoAdmin>
      <section className="caja-sesion">
        <ProductoForm
          key={producto.id}
          producto={producto}
          productos={estado.productos}
          categorias={estado.categorias}
          onGuardar={guardar}
          onCancelar={() => navigate(`/admin/productos/${producto.id}`)}
        />
      </section>
    </>
  );
}
