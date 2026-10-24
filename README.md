# FamiSalud · Gestión de salud en familia

FamiSalud es una aplicación full stack para organizar la información de salud de una persona y su familia desde un solo lugar. Permite consultar antecedentes clínicos, administrar medicamentos y sus horarios, llevar un registro de tomas, gestionar autorizaciones y recogidas, organizar citas médicas y conservar documentos asociados a la atención.

El proyecto está desarrollado como **monorepo**: frontend y API viven en carpetas separadas, pero forman una misma aplicación.

## Objetivo del proyecto

Construir una experiencia sencilla y responsable para acompañar el cuidado cotidiano de la salud familiar, con perfiles vinculados a una identidad personal, permisos según la pertenencia a cada familia y mensajes claros para las acciones del usuario.

## Funcionalidades principales

- Registro, inicio de sesión, recuperación de contraseña y gestión de sesiones.
- Familias compartidas, invitaciones, perfiles y control de permisos.
- Perfil personal y preferencias de cuenta.
- Historia clínica: alergias, condiciones médicas, vacunas, signos vitales, contactos de emergencia y afiliación EPS.
- Medicamentos, horarios, registro de tomas e historial.
- Trámites de medicamentos: autorizaciones, renovaciones, entregas y recogidas.
- Citas médicas y seguimiento de asistencia.
- Documentos clínicos con almacenamiento en Cloudinary, vista previa y descarga.
- Notificaciones internas y recordatorios de medicamentos, citas y trámites.
- Dashboard con datos de la familia seleccionada y acciones rápidas.
- Interfaz adaptable a escritorio y móvil, modo claro/oscuro y componentes reutilizables.

## Tecnologías

### Frontend (`front/`)

- React 19 y JavaScript.
- Vite.
- Tailwind CSS 4.
- React Router.
- Lucide React.
- Fetch API, componentes compartidos y validación de formularios.

### API (`api/`)

- Node.js 24+ y Express 5.
- PostgreSQL.
- JWT, cookies HttpOnly para refresh tokens y bcryptjs.
- Zod para validación.
- Cloudinary para archivos e imágenes.
- Nodemailer para recuperación de contraseña e invitaciones.
- `node-cron` para tareas programadas en un proceso persistente/local.

## Estructura del monorepo

```text
famisalud.app/
├── famisalud-api/
│   ├── src/
│   │   ├── config/
│   │   ├── middlewares/
│   │   ├── modules/
│   │   └── shared/
│   ├── index.js
│   ├── package.json
│   └── vercel.json
├── famisalud-web/
│   ├── src/
│   │   ├── features/
│   │   ├── routes/
│   │   └── shared/
│   ├── package.json
│   └── vite.config.js
├── netlify.toml
└── README.md
```

## Seguridad y alcance

- Los datos clínicos requieren permisos por persona y familia; no deben compartirse desde el frontend sin validación de la API.
- Desactiva cualquier bypass de autenticación de desarrollo en producción (`ENABLE_DEV_AUTH=false`).
- Utiliza HTTPS y un `JWT_SECRET` aleatorio de al menos 32 caracteres.
- Las notificaciones internas y los recordatorios de backend no equivalen por sí solos a notificaciones push en Android/iOS. La aplicación móvil con React Native y push notifications forma parte de una posible etapa posterior.

## Estado

Proyecto de portafolio en evolución. El código y la documentación describen la arquitectura implementada y las integraciones previstas; cada despliegue debe validarse con pruebas reales de autenticación, permisos familiares, documentos, citas, medicamentos y tareas programadas.
