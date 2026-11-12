-- =============================================================================
-- Fase 0 de seguridad (2026-11-12): que la BD exija las mismas reglas que el
-- formulario. La clave pública (anon) viaja en el código del sitio, así que
-- cualquiera puede escribir directo en la BD sin pasar por el formulario: estas
-- reglas cierran esa puerta trasera. Ya incluidas en schema.sql.
--
-- Se puede ejecutar más de una vez. Las restricciones van con NOT VALID: solo
-- se aplican a reportes NUEVOS; los existentes no se revisan ni se tocan.
-- =============================================================================

-- 1) Datos válidos en cada reporte nuevo -------------------------------------
alter table public.incidents drop constraint if exists incidents_title_len;
alter table public.incidents add constraint incidents_title_len
  check (char_length(title) between 1 and 150) not valid;

alter table public.incidents drop constraint if exists incidents_description_len;
alter table public.incidents add constraint incidents_description_len
  check (char_length(coalesce(description, '')) <= 1500) not valid;

alter table public.incidents drop constraint if exists incidents_place_len;
alter table public.incidents add constraint incidents_place_len
  check (char_length(coalesce(district, '')) <= 80
     and char_length(coalesce(provincia, '')) <= 80
     and char_length(coalesce(departamento, '')) <= 80) not valid;

alter table public.incidents drop constraint if exists incidents_fault_type_valid;
alter table public.incidents add constraint incidents_fault_type_valid
  check (fault_type in ('apagado', 'intermitente', 'pegado', 'dañado', 'desfasado', 'otro')) not valid;

-- Dentro del Perú (rectángulo con un pequeño margen).
alter table public.incidents drop constraint if exists incidents_in_peru;
alter table public.incidents add constraint incidents_in_peru
  check (lat between -18.6 and 0.2 and lng between -81.6 and -68.4) not valid;

alter table public.incidents drop constraint if exists incidents_max_photos;
alter table public.incidents add constraint incidents_max_photos
  check (cardinality(photos) <= 4) not valid;

-- 2) Las fotos deben ser archivos de NUESTRO bucket que existan ---------------
--    (evita reportes con enlaces a imágenes de cualquier sitio). Si usas otro
--    proyecto de Supabase, cambia la dirección de abajo por la tuya.
create or replace function public.photos_are_ours(urls text[])
returns boolean
language sql
stable
security definer
set search_path = public, storage as $$
  select coalesce(bool_and(
           left(u, length(p.prefix)) = p.prefix
           and exists (
             select 1 from storage.objects o
              where o.bucket_id = 'incident-photos'
                and o.name = substr(u, length(p.prefix) + 1)
           )
         ), true)
    from unnest(coalesce(urls, '{}'::text[])) as u,
         (select 'https://ouupzzzhueiazeawvkby.supabase.co/storage/v1/object/public/incident-photos/'::text as prefix) as p
$$;

-- 3) Un reporte nuevo solo puede nacer "limpio" -------------------------------
--    Estado Reportado, sin marcas ni ocultamiento, con fecha de ahora (no
--    inventada), y fotos propias. Antes: `with check (true)` = cualquier cosa.
drop policy if exists "ciudadanía crea incidents" on public.incidents;
create policy "ciudadanía crea incidents" on public.incidents
  for insert with check (
    status = 'reported'
    and flags = 0
    and hidden = false
    and removed_at is null
    and coalesce(removed_reason, '') = ''
    and created_at between now() - interval '10 minutes' and now() + interval '10 minutes'
    and public.photos_are_ours(photos)
    and (photo_url is null or photo_url = photos[1])
  );

-- 4) Bucket de fotos: solo imágenes, máximo 5 MB ------------------------------
--    (las fotos comprimidas por la app pesan ~0,2–0,4 MB).
update storage.buckets
   set file_size_limit = 5242880,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
 where id = 'incident-photos';

-- Nombre de archivo con el formato que usa la app (`<timestamp>-<azar>.<ext>`):
-- impide crear carpetas o nombres arbitrarios en el bucket.
drop policy if exists "fotos subida" on storage.objects;
create policy "fotos subida" on storage.objects
  for insert with check (
    bucket_id = 'incident-photos'
    and name ~ '^[0-9]{10,16}-[a-z0-9]{1,12}\.(jpg|png|webp)$'
  );

-- 5) Verificación: debería listar 6 restricciones, la política y el bucket.
select conname from pg_constraint
 where conrelid = 'public.incidents'::regclass and conname like 'incidents_%' and contype = 'c'
 order by 1;
