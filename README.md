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

## Camino a producción (Supabase)

`src/data/store.js` define la interfaz del repositorio. Para producción:

1. Crear proyecto en Supabase, habilitar **PostGIS**.
2. Tabla `incidents` (con columna `geography(Point)` para consultas por cercanía).
3. **Storage** para las fotos (hoy se guardan como dataURL).
4. **Auth** + Row Level Security: lectura pública; escritura de estado solo para
   rol `reviewer` (autoridad).
5. Reemplazar el cuerpo de cada función de `store.js` por llamadas a Supabase,
   manteniendo las mismas firmas. La UI no cambia.

Esquema sugerido:

```sql
create table incidents (
  id uuid primary key default gen_random_uuid(),
  title text,
  description text,
  fault_type text,
  district text,
  geom geography(Point) not null,
  status text not null default 'reported',
  photo_url text,
  created_at timestamptz not null default now()
);
create table status_changes (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid references incidents(id),
  status text not null,
  note text,
  changed_by uuid,
  at timestamptz not null default now()
);
```

## Ideas siguientes

- Detección de duplicados con `ST_DWithin` (ya esbozada con Haversine en el demo).
- Notificaciones cuando cambia el estado de un reporte que sigues.
- Compatibilidad con el estándar **Open311** para interoperar con sistemas oficiales.
- Service worker para uso offline real (PWA instalable).
- Panel de transparencia por distrito (tiempo promedio de reparación).
