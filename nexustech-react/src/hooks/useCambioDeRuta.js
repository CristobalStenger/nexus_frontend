import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';

// Ruta de la última página dibujada. En la primera (null) el foco no se mueve, así el primer Tab
// llega a "Saltar al contenido". Es del módulo porque la tienda y el panel usan layouts distintos.
let rutaAnterior = null;

// Al cambiar de página: vuelve arriba y mueve el foco al contenido principal
export function useCambioDeRuta() {
  const { pathname } = useLocation();
  const main = useRef(null);

  useEffect(() => {
    const cambio = rutaAnterior !== null && rutaAnterior !== pathname;
    rutaAnterior = pathname;
    if (!cambio) return;
    window.scrollTo(0, 0);
    main.current?.focus({ preventScroll: true });
  }, [pathname]);

  return main;
}
