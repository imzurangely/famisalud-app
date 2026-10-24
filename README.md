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

### Infraestructura prevista

- Netlify para el frontend estático.
- Vercel para la API HTTP, con un programador externo para los recordatorios frecuentes si se utiliza el plan Hobby. `api/index.js` es la entrada serverless; `api/src/index.js` conserva el servidor local y `node-cron`.
- Supabase para PostgreSQL.

> El despliegue propuesto es una configuración de portafolio. Las cargas de archivos de más de 4,5 MB y los recordatorios que requieren precisión deben validarse con especial cuidado antes de considerar el servicio apto para uso real.

## Estructura del monorepo

```text
FamiSalud/
├── api/
│   ├── database/
│   │   ├── migrations/
│   │   └── seeds/
│   ├── scripts/
│   ├── src/
│   │   ├── config/
│   │   ├── middlewares/
│   │   ├── modules/
│   │   └── shared/
│   ├── tests/
│   ├── index.js
│   ├── package.json
│   └── vercel.json
├── front/
│   ├── src/
│   │   ├── features/
│   │   ├── routes/
│   │   └── shared/
│   ├── package.json
│   └── vite.config.js
├── netlify.toml
├── DEPLOYMENT.md
└── README.md
```

## Ejecutar en local

Requisitos: Node.js 24.x y npm 11 o superior, PostgreSQL y credenciales de los servicios externos que quieras probar.

### 1. Configurar la base de datos

Crea una base de datos PostgreSQL local y ejecuta los archivos SQL de `api/database/migrations/` **en orden numérico** sobre una base vacía. No ejecutes los seeds de demostración en una base con información real.

### 2. Iniciar la API

```bash
cd api
npm ci
```

Copia `.env.example` como `.env` y completa las variables necesarias. Después:

```bash
npm run dev
```

La API local usa `http://localhost:3000` y el endpoint de salud es `http://localhost:3000/health`.

### 3. Iniciar el frontend

En otra terminal:

```bash
cd front
npm ci
```

Crea `front/.env` con la URL de tu API local:

```dotenv
VITE_API_BASE_URL=http://localhost:3000/api
```

Luego ejecuta:

```bash
npm run dev
```

Vite mostrará la dirección local, normalmente `http://localhost:5173`.

## Variables de entorno importantes

- API: `DATABASE_URL`, `DATABASE_SSL`, `FRONTEND_URL`, `JWT_SECRET`, `ENABLE_DEV_AUTH`, credenciales `CLOUDINARY_*`, credenciales `SMTP_*` y `CRON_SECRET` para tareas programadas.
- Frontend: `VITE_API_BASE_URL`, que debe incluir el prefijo `/api`.

Nunca subas `.env`, credenciales de Supabase, secretos JWT, credenciales SMTP ni el secreto de cron al repositorio. El archivo `.env.example` debe contener únicamente ejemplos sin secretos reales.

## Despliegue

Consulta [`DEPLOYMENT.md`](./DEPLOYMENT.md) para configurar Supabase, Vercel y Netlify, proteger los endpoints de cron y entender las limitaciones del plan gratuito.

## Verificación antes de publicar

En el frontend (`front/`), ejecuta los scripts disponibles:

```bash
cd front
npm ci
npm run lint
npm run build
```

En la API (`api/`), inicia el servicio con `npm run dev` y valida sus rutas mediante las peticiones de `api/tests/`. También puedes comprobar la sintaxis de los archivos modificados con `node --check ruta/al/archivo.js`. La API no declara actualmente scripts `lint` ni `build` en su `package.json`.

El frontend genera `front/dist/`. El build y las pruebas locales no sustituyen las pruebas de extremo a extremo contra una base de datos desplegada.

## Seguridad y alcance

- Los datos clínicos requieren permisos por persona y familia; no deben compartirse desde el frontend sin validación de la API.
- Desactiva cualquier bypass de autenticación de desarrollo en producción (`ENABLE_DEV_AUTH=false`).
- Utiliza HTTPS y un `JWT_SECRET` aleatorio de al menos 32 caracteres.
- Las notificaciones internas y los recordatorios de backend no equivalen por sí solos a notificaciones push en Android/iOS. La aplicación móvil con React Native y push notifications forma parte de una posible etapa posterior.

## Estado

Proyecto de portafolio en evolución. El código y la documentación describen la arquitectura implementada y las integraciones previstas; cada despliegue debe validarse con pruebas reales de autenticación, permisos familiares, documentos, citas, medicamentos y tareas programadas.
