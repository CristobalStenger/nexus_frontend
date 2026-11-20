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

Desde la entrega 3 la aplicación usa la API REST del backend. En las pruebas, `tests/servidorFalso.js`
reemplaza a `fetch` por un servidor en memoria que responde como el API Gateway (mismas rutas
`/api/v1`, JSON, códigos HTTP y datos iniciales), así no hace falta encender los microservicios.

```bash
npm run test:run        # 177 pruebas en 19 archivos
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
| `tests/unitarias/validaciones.test.js`       |      25 | RUN (módulo 11), dominios de correo, contraseña (opcional al editar), registro, contacto, producto, categoría, checkout y tarjeta |
| `tests/unitarias/formatos.test.js`           |      11 | Formato CLP, FREE, precio con descuento, normalización, slugs, fechas, estados de stock                              |
| `tests/unitarias/catalogo.test.js`           |       8 | Filtros combinados (texto, categoría, tipo, rango, disponibilidad) y los cuatro órdenes                              |
| `tests/unitarias/reportes.test.js`           |       6 | Resumen de ventas, ventas por categoría y por día, más vendidos, inventario valorizado, historial por usuario        |
| `tests/unitarias/crud.test.js`               |       2 | Obtener, crear, actualizar y eliminar sin mutar el arreglo original                                                  |
| `tests/unitarias/api.test.js`                |       9 | Llamadas REST: URL `/api/v1`, JSON, token JWT, 204, errores del backend, 401/403, sin conexión y adaptadores         |
| `tests/unitarias/persistencia.test.js`       |       9 | Carrito y cupón en el navegador, sesión con token vigente y sin contraseña, mensajes de contacto                     |
| `tests/unitarias/tiendaReducer.test.js`      |      22 | Carrito con límite de stock, cupón, totales, catálogo y órdenes del backend, boleta pagada y rechazada, CRUD         |
| `tests/unitarias/authReducer.test.js`        |       8 | Sesión con JWT, sesión vencida, roles, lista de usuarios y perfil propio                                             |
| `tests/componentes/ProductoCard.test.jsx`    |       6 | Props, evento de clic, botón deshabilitado sin stock, precio con oferta y FREE                                       |
| `tests/componentes/ProductoGrid.test.jsx`    |       2 | Renderizado de listas y estado vacío                                                                                 |
| `tests/componentes/FiltrosCatalogo.test.jsx` |       2 | Componente controlado: informa cambios al padre y limpia filtros                                                     |
| `tests/componentes/ConfirmarModal.test.jsx`  |       2 | Modal abierto/cerrado y funciones confirmar/cancelar                                                                 |
| `tests/componentes/CampoFormulario.test.jsx` |       3 | Etiqueta asociada, error con `aria-describedby`, variante select                                                     |
| `tests/integracion/formularios.test.jsx`     |       7 | Login (mensaje 401 del backend), registro completo (409 si el correo existe) y Contacto                              |
| `tests/integracion/compra.test.jsx`          |      15 | Carrito, cupón validado en el backend, checkout, boleta pagada y rechazada, reintento, servidor caído                 |
| `tests/integracion/admin.test.jsx`           |      16 | Dashboard, órdenes, reportes, CRUD de productos, categorías y usuarios contra la API, perfil, cerrar sesión          |
| `tests/integracion/App.test.jsx`             |      23 | Navegación, 404, catálogo, rutas por rol, vista del vendedor, token vencido o rechazado, servidor caído              |
| `tests/integracion/foco.test.jsx`            |       1 | Al abrir la app el foco no se mueve; al navegar pasa al contenido principal                                          |
| **Total**                                    | **177** |                                                                                                                      |

## 4. Resultado de cobertura

Se mide solo `src/` (las pruebas viven en `tests/`) y se excluyen `main.jsx` y los datos iniciales (`src/data`).

| Métrica       | Cobertura | Detalle      |
| ------------- | --------: | ------------ |
| Sentencias    | 96,08 %   | 1154 / 1201  |
| Ramas         | 91,61 %   | 798 / 871    |
| Funciones     | 95,68 %   | 421 / 440    |
| Líneas        | 96,96 %   | 1023 / 1055  |

Por carpeta (líneas): `services` 100 %, `store` 100 %, `utils` 99,1 %, `components` 90–100 % (`comunes` es la más baja),
`pages/tienda` 96,9 %, `pages/admin` 92,2 %, `context` 93,4 %.

## 5. Análisis

- **Lógica de negocio (reducers, servicios y utilidades) cerca del 100 %.** Es la parte con más
  reglas (stock, cupones, pago, validaciones) y se prueba como funciones puras, sin renderizar.
- **Lo que queda sin cubrir** son sobre todo ramas defensivas: páginas de edición abiertas con un
  id que no existe, el botón para cerrar manualmente un aviso emergente y los mensajes de error
  de los hooks cuando se usan fuera de su provider. Son casos difíciles de provocar desde la
  interfaz y no contienen reglas de negocio.
- **Riesgos que las pruebas no cubren:** jsdom no dibuja estilos, así que el diseño responsive se
  revisó manualmente en Chromium a 390 px y 1280 px; las imágenes externas de los productos no se
  cargan en las pruebas; el servidor falso imita al backend, por eso la integración también se
  probó con los microservicios reales y Playwright (DOCUMENTACION.md, sección 10.8).
- **Cobertura no es ausencia de errores:** indica qué código se ejecutó, no que todos los casos
  posibles estén verificados. Por eso las pruebas comprueban comportamientos visibles (textos,
  botones, valores guardados) y no detalles internos de los componentes.
