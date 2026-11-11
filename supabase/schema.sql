-- =============================================================================
-- SemáforoAlerta — esquema de base de datos para Supabase
-- -----------------------------------------------------------------------------
-- Pega TODO este archivo en el SQL Editor de Supabase y ejecútalo una vez.
-- Crea: extensión PostGIS, tablas, historial automático, políticas RLS y el
-- bucket de Storage para las fotos.
-- =============================================================================

-- 1) PostGIS (para consultas geográficas futuras: "semáforos a X metros")
create extension if not exists postgis;

-- 2) Tabla principal de incidencias ------------------------------------------
create table if not exists public.incidents (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text default '',
  fault_type  text default 'otro',
  departamento text default '',           -- división política del Perú (UBIGEO)
  provincia   text default '',
  district    text default 'Otro',        -- distrito (nombre histórico de la columna)
  lat         double precision not null,
  lng         double precision not null,
  -- Columna geográfica derivada (para PostGIS / ST_DWithin más adelante).
  geom        geography(Point, 4326)
              generated always as (st_setsrid(st_makepoint(lng, lat), 4326)::geography) stored,
  status      text not null default 'reported'
              check (status in ('reported','acknowledged','in_progress','resolved','duplicate')),
  photo_url   text,                       -- foto principal (compatibilidad)
  photos      text[] not null default '{}', -- todas las fotos del reporte (URLs públicas)
  flags       int not null default 0,      -- cuántas personas reportaron el contenido
  hidden      boolean not null default false, -- se oculta del público tras varios reportes
  created_at  timestamptz not null default now()
);

-- Para bases ya creadas antes de estas columnas: agrégalas si faltan.
alter table public.incidents
  add column if not exists photos text[] not null default '{}';
alter table public.incidents
  add column if not exists flags int not null default 0;
alter table public.incidents
  add column if not exists hidden boolean not null default false;
alter table public.incidents
  add column if not exists departamento text default '';
alter table public.incidents
  add column if not exists provincia text default '';

create index if not exists incidents_status_idx on public.incidents (status);
create index if not exists incidents_geom_idx on public.incidents using gist (geom);

-- 3) Historial de cambios de estado (rendición de cuentas) -------------------
create table if not exists public.status_changes (
  id          uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  status      text not null,
  note        text default '',
  changed_by  uuid references auth.users(id),  -- quién lo cambió (cuando haya login)
  at          timestamptz not null default now()
);

create index if not exists status_changes_incident_idx on public.status_changes (incident_id);

-- 4) Al crear una incidencia, registra automáticamente el primer evento ------
--    (así el cliente anónimo no necesita escribir en status_changes).
create or replace function public.add_initial_status_change()
returns trigger language plpgsql security definer as $$
begin
  insert into public.status_changes (incident_id, status, note)
  values (new.id, new.status, 'Reporte ciudadano');
  return new;
end;
$$;

drop trigger if exists trg_initial_status on public.incidents;
create trigger trg_initial_status
  after insert on public.incidents
  for each row execute function public.add_initial_status_change();

-- 4b) Reportar contenido de abuso (foto/relato inapropiado o falso) -----------
--     `security definer` para que el público pueda sumar un reporte SIN tener
--     permiso general de UPDATE sobre incidents. Al llegar al umbral, el
--     contenido se oculta del mapa público hasta que un revisor lo revise.
create or replace function public.flag_incident(target uuid)
returns int
language plpgsql
security definer
set search_path = public as $$
declare
  threshold constant int := 5;
  new_count int;
begin
  update public.incidents
     set flags  = flags + 1,
         hidden = (flags + 1) >= threshold
   where id = target
   returning flags into new_count;
  return new_count;  -- null si el id no existe
end;
$$;

grant execute on function public.flag_incident(uuid) to anon, authenticated;

-- 5) Seguridad a nivel de fila (RLS) -----------------------------------------
alter table public.incidents enable row level security;
alter table public.status_changes enable row level security;

-- Lectura pública: cualquiera ve el mapa (transparencia), EXCEPTO el contenido
-- ocultado por reportes de abuso. Los revisores sí ven todo (para moderar).
drop policy if exists "lectura pública incidents" on public.incidents;
create policy "lectura pública incidents" on public.incidents
  for select using (
    not hidden
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'reviewer'
  );

drop policy if exists "lectura pública status" on public.status_changes;
create policy "lectura pública status" on public.status_changes
  for select using (true);

-- Cualquier ciudadano puede crear un reporte (anónimo).
drop policy if exists "ciudadanía crea incidents" on public.incidents;
create policy "ciudadanía crea incidents" on public.incidents
  for insert with check (true);

-- ---------------------------------------------------------------------------
-- "MODO AUTORIDAD": quién puede cambiar el estado de una incidencia.
--
-- FASE 2 (ACTIVA): sólo usuarios autenticados con rol 'reviewer' pueden
-- actualizar estados y escribir en el historial. El rol vive en app_metadata y
-- sólo lo asigna un admin (service_role); el usuario NO puede auto-asignárselo.
-- (La creación de reportes y la lectura siguen siendo públicas — ver arriba.)
--
-- Limpia cualquier resto de la FASE 1 antes de crear las políticas seguras.
drop policy if exists "fase1 cualquiera actualiza" on public.incidents;
drop policy if exists "fase1 cualquiera escribe historial" on public.status_changes;

drop policy if exists "autoridad actualiza" on public.incidents;
create policy "autoridad actualiza" on public.incidents
  for update to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'reviewer')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'reviewer');

drop policy if exists "autoridad escribe historial" on public.status_changes;
create policy "autoridad escribe historial" on public.status_changes
  for insert to authenticated
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'reviewer');

-- Moderación: un revisor puede eliminar un reporte marcado por la comunidad
-- (spam/abuso confirmado). Sin esta política, restoreIncident/deleteIncident
-- en supabaseStore.js fallarían: sin policy de delete, RLS deniega por
-- defecto. status_changes necesita su propia policy de delete porque el
-- `on delete cascade` de la FK también pasa por RLS de esa tabla.
drop policy if exists "autoridad elimina" on public.incidents;
create policy "autoridad elimina" on public.incidents
  for delete to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'reviewer');

drop policy if exists "autoridad elimina historial" on public.status_changes;
create policy "autoridad elimina historial" on public.status_changes
  for delete to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'reviewer');

-- FASE 1 (ROLLBACK, ⚠ INSEGURO): permite que cualquiera actualice estados, sin
-- login. Útil sólo para probar el flujo al inicio. Para volver a ella, borra las
-- políticas "autoridad ..." de arriba y descomenta esto:
--
-- drop policy if exists "autoridad actualiza" on public.incidents;
-- drop policy if exists "autoridad escribe historial" on public.status_changes;
-- create policy "fase1 cualquiera actualiza" on public.incidents
--   for update using (true) with check (true);
-- create policy "fase1 cualquiera escribe historial" on public.status_changes
--   for insert with check (true);
-- ---------------------------------------------------------------------------

-- 6) Storage: bucket público para las fotos de los reportes ------------------
insert into storage.buckets (id, name, public)
values ('incident-photos', 'incident-photos', true)
on conflict (id) do nothing;

-- Lectura pública de las fotos.
drop policy if exists "fotos lectura pública" on storage.objects;
create policy "fotos lectura pública" on storage.objects
  for select using (bucket_id = 'incident-photos');

-- Subida de fotos (FASE 1: cualquiera; endurecer junto con la autenticación).
drop policy if exists "fotos subida" on storage.objects;
create policy "fotos subida" on storage.objects
  for insert with check (bucket_id = 'incident-photos');
