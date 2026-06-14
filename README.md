# SemáforoAlerta 🚦

Mapa público y transparente de **semáforos malogrados en Lima, Perú**.

La ciudadanía reporta un semáforo malogrado (foto + ubicación + descripción) y
queda visible en un mapa para todos. La autoridad puede marcar cada incidencia
como *Revisado → En reparación → Resuelto*. La transparencia es el producto: un
backlog público y accionable que permite exigir reparaciones.

## Por qué

Hoy reportar un semáforo en Lima se hace por WhatsApp o apps donde el reporte es
un "agujero negro": no sabes si alguien lo vio ni cuándo se reparará. Este
proyecto agrega lo que falta: **visibilidad pública, historial y rendición de
cuentas**.

## Demo

```bash
npm install
npm run dev
```

Abre http://localhost:5173

- **+ Reportar semáforo** → usa tu ubicación o toca el mapa, sube una foto, describe la falla.
- **Modo autoridad** (switch arriba a la derecha) → cambia el estado de una incidencia.
- Los datos del demo se guardan en `localStorage` (no hay backend todavía).

## Stack

- **React + Vite** (PWA) — funciona en cualquier navegador móvil, sin app store.
- **Leaflet + OpenStreetMap** — mapa gratuito, sin facturación por API.
- **Capa de datos intercambiable** (`src/data/store.js`) — hoy `localStorage`,
  mañana Supabase sin tocar la UI.

## Arquitectura

```
src/
  constants.js          Estados, tipos de falla, distritos, centro de Lima
  data/
    seed.js             Incidencias de ejemplo (cruces reales de Lima)
    store.js            Repositorio: list/create/updateStatus/getStats/findNearby
  components/
    MapView.jsx         Mapa principal con pines por estado
    ReportForm.jsx      Formulario + mini-mapa para fijar ubicación + geolocalización
    IncidentDetail.jsx  Detalle, historial y acciones de autoridad
    StatusBadge.jsx
  App.jsx               Layout, filtros, estadísticas, modo autoridad
```

## Conectar Supabase (ya está cableado)

La capa de datos elige el backend automáticamente: **si hay credenciales de
Supabase en `.env`, usa Supabase; si no, usa `localStorage` (demo)**. La UI no
cambia. El indicador arriba a la derecha muestra cuál está activo
(🟢 Supabase / 🟡 Demo local).

Para activar Supabase:

1. Crea un proyecto en [supabase.com](https://supabase.com) (región US, más cerca de Perú).
2. En **SQL Editor**, pega y ejecuta [`supabase/schema.sql`](supabase/schema.sql)
   (crea tablas, PostGIS, historial automático, RLS y el bucket de fotos).
3. En **Project Settings → API**, copia el **Project URL** y la **anon public key**.
4. Pégalas en `.env` (basado en `.env.example`):
   ```
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-anon-public-key
   ```
5. Reinicia `npm run dev`. El indicador debe cambiar a **🟢 Supabase**.

### Archivos clave
- `src/data/store.js` — selecciona el backend y expone la interfaz async.
- `src/data/localStore.js` — backend localStorage (demo).
- `src/data/supabaseStore.js` — backend Supabase (consultas + subida de fotos a Storage).
- `src/data/supabaseClient.js` — crea el cliente y detecta si está configurado.
- `supabase/schema.sql` — esquema completo para pegar en Supabase.

### Seguridad de "modo autoridad"
`schema.sql` trae políticas RLS en **dos fases**:
- **Fase 1 (ahora):** cualquiera puede actualizar estados — sólo para probar la
  conexión. ⚠ Inseguro.
- **Fase 2:** con Supabase Auth + rol `reviewer`, sólo autoridades verificadas
  cambian estados. Las políticas ya están escritas (comentadas) en el archivo.

## Ideas siguientes

- Detección de duplicados con `ST_DWithin` (ya esbozada con Haversine en el demo).
- Notificaciones cuando cambia el estado de un reporte que sigues.
- Compatibilidad con el estándar **Open311** para interoperar con sistemas oficiales.
- Service worker para uso offline real (PWA instalable).
- Panel de transparencia por distrito (tiempo promedio de reparación).
