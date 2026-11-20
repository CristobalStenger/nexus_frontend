# NexusTech

Tienda en línea de tecnología, componentes y gaming (Desarrollo Fullstack II).

| Entrega | Carpeta | Tecnologías |
| ------- | ------- | ----------- |
| Evaluación 1 | [`nexustech-html/`](https://github.com/CristobalStenger/nexus_frontend/tree/948ceaf472d32a08d28bb0cf4581a54355025353/nexustech-html), solo en el commit `948ceaf` (ya no está en `main`) | HTML, CSS, Bootstrap 5 y JavaScript |
| Evaluación 2 | [`nexustech-react/`](nexustech-react/README.md) | React 19, Vite 7, React Router 7, React Bootstrap, Vitest |
| Evaluación 3 | `nexustech-react/` + backend [`nexus_backend`](https://github.com/CristobalStenger/nexus_backend) | Integración por API REST (`fetch` + JWT) con 4 microservicios Spring Boot y PostgreSQL |

Para ejecutar la versión React, primero levanta el backend (ver su README) y luego:

```bash
cd nexustech-react
npm ci
cp .env.example .env.local   # VITE_API_URL: dirección del API Gateway
npm run dev
```

Documentación:

- [`DOCUMENTACION.md`](DOCUMENTACION.md): explicación completa del proyecto, la migración de
  HTML/CSS/JS a React + Vite, las funciones y pestañas nuevas, las pruebas unitarias y la
  integración con el backend (sección 10).
- [`nexustech-react/docs/COBERTURA_TESTING.md`](nexustech-react/docs/COBERTURA_TESTING.md):
  documento de cobertura de pruebas.
