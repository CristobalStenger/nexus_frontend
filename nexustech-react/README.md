# NexusTech React (Evaluaciones 2 y 3)

Tienda de tecnología **NexusTech** migrada desde HTML + JavaScript (entrega 1, guardada en
el commit [`948ceaf`](https://github.com/CristobalStenger/nexus_frontend/tree/948ceaf472d32a08d28bb0cf4581a54355025353/nexustech-html)) a **React 19 + Vite 7**, con React Router 7,
React Bootstrap, Context + `useReducer` y pruebas con Vitest + Testing Library. Desde la
entrega 3 los datos vienen del backend ([`nexus_backend`](https://github.com/CristobalStenger/nexus_backend)):
API REST con `fetch` y autenticación JWT.

## Puesta en marcha

Requiere Node.js 20.19 o superior y el backend encendido (su API Gateway queda en
`http://localhost:8080`; ver el README de `nexus_backend`).

```bash
cd nexustech-react
npm ci                       # instala las versiones exactas de package-lock.json
cp .env.example .env.local   # VITE_API_URL: dirección del API Gateway
npm run dev                  # servidor de desarrollo en http://localhost:5173
```

En Vercel, importa el repositorio con **Root Directory** `nexustech-react`, define
`VITE_API_URL` con la URL del gateway en Cloud Run (*Settings → Environment Variables*) y vuelve
a desplegar. `vercel.json` hace que todas las rutas respondan `index.html` y agrega cabeceras de
seguridad. Luego autoriza ese dominio en el gateway (`FRONTEND_URL`, ver el README del backend).
Las pruebas no necesitan el backend: usan un servidor falso (`tests/servidorFalso.js`).

| Script                  | Qué hace                                               |
| ----------------------- | ------------------------------------------------------ |
| `npm run dev`           | Servidor de desarrollo con recarga automática          |
| `npm run build`         | Compilación de producción en `dist/`                   |
| `npm run preview`       | Sirve la compilación de `dist/`                        |
| `npm run lint`          | Revisión de código con ESLint                          |
| `npm test`              | Vitest en modo observación                             |
| `npm run test:run`      | Ejecuta todas las pruebas una vez                      |
| `npm run test:coverage` | Pruebas + reporte de cobertura (`coverage/index.html`) |

## Cuentas de prueba

| Rol           | Correo              | Contraseña   | Acceso                                            |
| ------------- | ------------------- | ------------ | ------------------------------------------------- |
| Administrador | `admin@duoc.cl`     | `admin123`   | Tienda + panel completo (crear, editar, eliminar) |
| Vendedor      | `vendedor@duoc.cl`  | `vende123`   | Tienda + panel con solo Productos y Órdenes (lista y detalle) |
| Cliente       | `cliente@gmail.com` | `cliente123` | Solo la tienda (checkout autocompletado)          |

En el checkout se acepta cualquier tarjeta de 16 dígitos con vencimiento vigente; las terminadas
en `0000` son rechazadas.

## Estructura

```
nexustech-react/
├── public/            favicon y _redirects (todas las rutas responden index.html)
├── vercel.json        la misma regla para Vercel
├── .env.example       VITE_API_URL (dirección del API Gateway)
├── docs/              COBERTURA_TESTING.md
├── src/
│   ├── data/          Datos fijos (configuración, regiones, blogs, portada)
│   ├── services/      api.js (REST + JWT), CRUD genérico y lo que guarda el navegador
│   ├── store/         Reducers: funciones puras que aplican las respuestas del backend
│   ├── context/       TiendaProvider y AuthProvider (llaman a la API)
│   ├── hooks/         useTienda, useAuth, useFormulario, useTitulo, useCambioDeRuta
│   ├── utils/         Formatos, validaciones, filtros del catálogo y reportes
│   ├── components/    Componentes reutilizables agrupados por tema
│   └── pages/
│       ├── tienda/    Una página por ruta de la tienda
│       └── admin/     Dashboard, Perfil, Reportes y una carpeta por sección
│                      (ordenes/, productos/, categorias/, usuarios/)
└── tests/             unitarias/, componentes/, integracion/, servidorFalso.js y datos/
```

## Documentación

Todo lo demás está en [`../DOCUMENTACION.md`](../DOCUMENTACION.md): migración y estructura
(sección 4), rutas y vistas nuevas (5), pruebas y cobertura (6), limitaciones (8) e
integración con el backend (10).
