# Cafe Log

Aplicación SPA construida con React + Vite + TypeScript + Tailwind para gestionar inventario de cafés, recetas, brews y métricas. Listo para desplegar en Netlify y conectado a Supabase Auth + Postgres.

## Requisitos

- Node.js 18 o superior
- npm
- Proyecto Supabase configurado

## Instalación

```bash
npm install
```

## Variables de entorno

1. Copia `.env.example` a `.env`.
2. Ajusta los valores si cuentas con otras credenciales de Supabase.

```bash
cp .env.example .env
```

## Desarrollo local

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`.

## Base de datos Supabase

1. Ingresa al panel de Supabase.
2. Abre el **SQL Editor**.
3. Copia el contenido de `supabase/schema.sql` y ejecútalo. Se crearán tablas, políticas RLS y triggers necesarios.

## Despliegue en Netlify

1. Crea un nuevo sitio en Netlify (conecta tu repositorio o sube la carpeta generada).
2. Configura los comandos de build:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
3. En la sección **Environment variables**, define:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Despliega el sitio.

El archivo `netlify.toml` ya incluye la redirección para SPA (`/* -> /index.html`).

## Scripts útiles

- `npm run dev`: servidor de desarrollo.
- `npm run build`: compila la app para producción.
- `npm run preview`: previsualiza la build localmente.

## Estructura destacada

- `src/router.tsx`: rutas públicas y protegidas.
- `src/hooks/useAuth.ts`: manejo de sesión con Supabase.
- `src/pages/*`: vistas para login, dashboard, coffees, recipes, brews y analytics.
- `src/components/*`: layout, formularios y UI reutilizable.
- `supabase/schema.sql`: migraciones iniciales con RLS.
# cerezo
