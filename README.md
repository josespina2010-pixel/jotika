# Sonora Hub — Catálogo Musical, Mapa Interactivo y Asistente Gemini

Sistema web dinámico dedicado a **tiendas de instrumentos musicales, escuelas de música y estudios de grabación**, con catálogo CRUD completo, persistencia en **Supabase**, mapa interactivo con **Google Maps Platform**, y asistente inteligente impulsado por **Gemini (`@google/genai`)**.

## Características principales

- **Catálogo CRUD completo**: Altas, bajas, modificaciones, consultas y filtrado en tiempo real por tipo de local (`tienda`, `escuela`, `estudio`), tipo de oferta (`instrumento`, `clase`, `servicio`) y categoría musical.
- **Google Maps interactivo**: Al menos 6 ubicaciones registradas con marcadores avanzados (`AdvancedMarker` + `InfoWindow`) y autocompletado de direcciones mediante Places API (New).
- **Asistente Inteligente Gemini**: Chat interactivo conectado directamente a los registros reales de la base de datos mediante *Function Calling* (`search_catalog`, `list_all_venues`).
- **Arquitectura segura**: Todas las claves privadas (`GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) se consumen exclusivamente en el servidor Express (`/api/*`).

## Configuración de Supabase

1. Crea un proyecto en [Supabase](https://supabase.com/).
2. Abre **SQL Editor** y ejecuta el archivo [`supabase/schema.sql`](supabase/schema.sql) para crear las tablas `venues` y `catalog_items` junto con sus índices y políticas RLS.
3. En **Project Settings → API**, copia:
   - `Project URL` → `SUPABASE_URL`
   - `service_role` secret key → `SUPABASE_SERVICE_ROLE_KEY`
4. Al iniciar la aplicación con ambas variables configuradas, si las tablas están vacías, se poblarán automáticamente con los 6 locales iniciales (o puedes usar el botón **Poblar datos iniciales** en la pestaña *Supabase & Deploy*).

## Desarrollo local

```bash
cp .env.example .env
# Completa GEMINI_API_KEY, VITE_GOOGLE_MAPS_API_KEY, SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
npm install
npm run dev
```

## Publicación en GitHub y Render

1. Sube el repositorio a GitHub asegurando que `.env` esté excluido por `.gitignore` (nunca subas claves reales).
2. En [Render](https://render.com/), crea un nuevo **Web Service** conectado a tu repositorio de GitHub (o importa `render.yaml`).
3. Configura:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. Agrega en **Environment Variables**:
   - `NODE_ENV=production`
   - `GEMINI_API_KEY`
   - `VITE_GOOGLE_MAPS_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Despliega y verifica `/api/health`.
