# Documento de cobertura del testing – NexusTech React

## 1. Herramientas

| Herramienta                   | Uso                                                              |
| ----------------------------- | ---------------------------------------------------------------- |
| Vitest 4                      | Ejecuta las pruebas y mide la cobertura (proveedor `v8`)          |
| jsdom                         | DOM simulado: `document`, `localStorage`, eventos                 |
| @testing-library/react        | Renderiza componentes y los busca como lo haría una persona       |
| @testing-library/user-event   | Simula escritura, clics y selección en listas                     |
| @testing-library/jest-dom     | Matchers como `toBeInTheDocument`, `toBeDisabled`, `toHaveValue`  |

El PDF propone Jasmine + Karma. Se usó Vitest + Testing Library (el stack de la guía del curso)
porque se integra con Vite sin configuración extra y Karma está descontinuado. Las pruebas
siguen la misma estructura de Jasmine (`describe`, `it`, `expect`) y cubren las cuatro categorías
pedidas: renderizado, props, estado y eventos.

Configuración: `vite.config.js` (`test.environment = 'jsdom'`, `setupFiles`) y
`tests/setup.js`, que limpia `localStorage`, desmonta los componentes y restaura los espías
entre pruebas para que ninguna dependa de otra.

```bash
npm run test:run        # 164 pruebas en 18 archivos
npm run test:coverage   # reporte en consola y en coverage/index.html
```

## 2. Pruebas pedidas por el PDF

| Categoría del PDF          | Tarea                                                         | Archivo y prueba                                                                                                                                           |
| -------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Renderizado correcto       | Los componentes de lista renderizan todos los elementos       | `ProductoGrid.test.jsx` › "renderiza una tarjeta por cada elemento" (40 tarjetas); `tests/integracion/App.test.jsx` › catálogo y ofertas                                      |
| Renderizado condicional    | Un mensaje de error solo se muestra cuando hay error          | `CampoFormulario.test.jsx` › "muestra el mensaje de error solo cuando recibe uno"; `formularios.test.jsx` › "el mensaje de credenciales incorrectas aparece solo si hay error"; `ConfirmarModal.test.jsx` › cerrado/abierto; `PrecioProducto` con y sin oferta |
| Propiedades (props)        | Un botón recibe la etiqueta y la función `onClick`            | `ProductoCard.test.jsx` › "muestra los datos recibidos por props" y "llama a la función onClick recibida con el id del producto"                            |
| Estado (state)             | El estado de un formulario cambia cuando el usuario escribe   | `formularios.test.jsx` › "el estado del formulario cambia cuando el usuario escribe"; contador de caracteres de Contacto; cantidad en el detalle de producto |
| Eventos                    | Un clic cambia el estado o ejecuta una función                | `ProductoCard.test.jsx` (clic → `onAgregar`); `FiltrosCatalogo.test.jsx` (cambios → `onCambio`); `compra.test.jsx` (botones + / − / eliminar del carrito)     |

## 3. Inventario de pruebas

| Archivo                                      | Pruebas | Qué verifica                                                                                                         |
| -------------------------------------------- | ------: | -------------------------------------------------------------------------------------------------------------------- |
| `tests/unitarias/validaciones.test.js`       |      25 | RUN (módulo 11), dominios de correo, contraseña, registro, contacto, producto, categoría, checkout, tarjeta, cupones |
| `tests/unitarias/formatos.test.js`           |      11 | Formato CLP, FREE, precio con descuento, normalización, slugs, fechas, estados de stock                              |
| `tests/unitarias/catalogo.test.js`           |       8 | Filtros combinados (texto, categoría, tipo, rango, disponibilidad) y los cuatro órdenes                              |
| `tests/unitarias/reportes.test.js`           |       6 | Resumen de ventas, ventas por categoría y por día, más vendidos, inventario valorizado, historial por usuario        |
| `tests/unitarias/crud.test.js`               |       3 | Obtener, id correlativo, crear, actualizar y eliminar sin mutar el arreglo original                                  |
| `tests/unitarias/persistencia.test.js`       |      10 | JSON corrupto, datos inválidos, catálogo vacío, ids repetidos, limpieza del carrito, sesión sin contraseña           |
| `tests/unitarias/tiendaReducer.test.js`      |      25 | Carrito con límite de stock, cupones, totales con envío, pago aprobado y rechazado, CRUD de productos y categorías   |
| `tests/unitarias/authReducer.test.js`        |      10 | Login, logout, roles, registro, CRUD de usuarios, perfil y reglas "no eliminar la propia cuenta" y "no cambiar el propio rol" |
| `tests/componentes/ProductoCard.test.jsx`    |       6 | Props, evento de clic, botón deshabilitado sin stock, precio con oferta y FREE                                       |
| `tests/componentes/ProductoGrid.test.jsx`    |       2 | Renderizado de listas y estado vacío                                                                                 |
| `tests/componentes/FiltrosCatalogo.test.jsx` |       2 | Componente controlado: informa cambios al padre y limpia filtros                                                     |
| `tests/componentes/ConfirmarModal.test.jsx`  |       2 | Modal abierto/cerrado y funciones confirmar/cancelar                                                                 |
| `tests/componentes/CampoFormulario.test.jsx` |       3 | Etiqueta asociada, error con `aria-describedby`, variante select                                                     |
| `tests/integracion/formularios.test.jsx`     |       7 | Login, registro completo y Contacto con validación en vivo                                                           |
| `tests/integracion/compra.test.jsx`          |      13 | Carrito, cupones, modal de vaciar, checkout, compra exitosa, pago rechazado, reintento, stock insuficiente           |
| `tests/integracion/admin.test.jsx`           |      15 | Dashboard, órdenes y boleta, reportes, CRUD de productos, categorías y usuarios, historial, perfil, cerrar sesión    |
| `tests/integracion/App.test.jsx`             |      15 | Navegación con NavLink, 404, buscador, categorías, ofertas, detalle, rutas protegidas por rol, sesión restaurada     |
| `tests/integracion/foco.test.jsx`            |       1 | Al abrir la app el foco no se mueve; al navegar pasa al contenido principal                                          |
| **Total**                                    | **164** |                                                                                                                      |

## 4. Resultado de cobertura

Se mide solo `src/` (las pruebas viven en `tests/`) y se excluyen `main.jsx` y los datos iniciales (`src/data`).

| Métrica       | Cobertura | Detalle      |
| ------------- | --------: | ------------ |
| Sentencias    | 97,13 %   | 1117 / 1150  |
| Ramas         | 92,13 %   | 820 / 890    |
| Funciones     | 95,81 %   | 412 / 430    |
| Líneas        | 97,51 %   | 980 / 1005   |

Por carpeta (líneas): `services` 100 %, `store` 100 %, `utils` 99,5 %, `components` 90–100 % (`comunes` es la más baja),
`pages/tienda` 96,9 %, `pages/admin` 92,3 %, `context` 93,9 %.

## 5. Análisis

- **Lógica de negocio (reducers, servicios y utilidades) cerca del 100 %.** Es la parte con más
  reglas (stock, cupones, pago, validaciones) y se prueba como funciones puras, sin renderizar.
- **Lo que queda sin cubrir** son sobre todo ramas defensivas: páginas de edición abiertas con un
  id que no existe, el botón para cerrar manualmente un aviso emergente y los mensajes de error
  de los hooks cuando se usan fuera de su provider. Son casos difíciles de provocar desde la
  interfaz y no contienen reglas de negocio.
- **Riesgos que las pruebas no cubren:** jsdom no dibuja estilos, así que el diseño responsive se
  revisó manualmente en Chromium a 390 px y 1280 px; las imágenes externas de los productos no se
  cargan en las pruebas; el login, los roles y el pago son simulaciones de frontend.
- **Cobertura no es ausencia de errores:** indica qué código se ejecutó, no que todos los casos
  posibles estén verificados. Por eso las pruebas comprueban comportamientos visibles (textos,
  botones, valores guardados) y no detalles internos de los componentes.
