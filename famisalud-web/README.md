# FamiSalud Web — Fundación del frontend

Primera etapa del frontend de FamiSalud. Crea la base visual y de navegación, pero todavía no implementa login ni consume datos reales de negocio; los módulos presentan datos ficticios o placeholders.

## Tecnologías y versiones estables fijadas

Las versiones directas están fijadas sin `^` para que `npm install` no cambie automáticamente la versión principal elegida:

| Paquete | Versión |
|---|---:|
| React | `19.3.1` |
| React DOM | `19.3.1` |
| Vite | `8.3.4` |
| `@vitejs/plugin-react` | `6.1.2` |
| Tailwind CSS | `4.3.3` |
| `@tailwindcss/vite` | `4.3.3` |
| React Router DOM | `7.18.3` |
| Lucide React | `1.60.0` |

Se selecciona Node.js 24 LTS como base de ejecución, en lugar de una versión Current no LTS, para priorizar estabilidad en el desarrollo.

## Requisitos

- Node.js 24 LTS.
- npm 11 o compatible.

Comprueba las versiones instaladas:

```bash
node -v
npm -v
```

El archivo `.nvmrc` indica `24` para quien usa un gestor de versiones de Node compatible.

## Instalación

Coloca `famisalud-web` al lado de `famisalud-api`, no dentro de `src` del backend:

```text
famisalud-app/
├── famisalud-api/
└── famisalud-web/
```

Desde la terminal de VS Code, entra a `famisalud-web` y ejecuta:

```bash
npm install
npm run build
npm run dev
```

`npm install` generará `package-lock.json`. Conserva ese archivo en el repositorio para fijar también las dependencias transitivas y poder reproducir instalaciones futuras.

Crea `.env` copiando `.env.example`. La URL por defecto es:

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

No coloques credenciales o secretos en variables `VITE_*`: se incorporan al código del navegador.

Abre la URL que muestre Vite (por defecto `http://localhost:5173`). Mantén el backend encendido en su terminal en `http://localhost:3000`.

## Comandos

- `npm run dev`: servidor local.
- `npm run build`: compilar para producción.
- `npm run preview`: servir localmente la compilación.

## Estructura

```text
src/
├── app/                 # navegación y configuración de rutas
├── components/layout/   # sidebar y topbar
├── context/             # preferencias globales, tema claro/oscuro
├── features/            # dashboard y pantallas de cada módulo
├── services/api.js      # cliente fetch común y ApiError
├── styles/              # importación de Tailwind y tokens visuales
├── App.jsx
└── main.jsx
```

## Cliente de API

`apiFetch('/auth/me')` construye la URL usando `VITE_API_BASE_URL`, envía `credentials: 'include'` para las cookies HttpOnly y adjunta el access token en memoria después de `setAccessToken(token)`. Acepta `FormData` sin forzar `Content-Type`, lo cual es importante para subir documentos.

Este primer paso no almacena tokens ni implementa la renovación. Se hará en la etapa de autenticación para respetar el flujo JWT + refresh cookie del backend.

## Interacciones presentes

- Sidebar y navegación responsive.
- Menú móvil con fondo para cerrar.
- Modo claro/oscuro con preferencia guardada en `localStorage`.
- Menús de notificaciones y perfil.
- Navegación entre pantallas preliminares.
- Dashboard de referencia con datos ficticios señalados como demostración.

## Siguiente etapa

Construiremos los formularios de autenticación y conectaremos los endpoints que ya probaste en el backend. Después integraremos familias y miembros. Los datos de demostración se eliminarán cuando el dashboard se conecte a la API.
