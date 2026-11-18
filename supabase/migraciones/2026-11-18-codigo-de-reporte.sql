-- =============================================================================
-- Código público de reporte (2026-11-18) — p. ej. LIM-MIR-000123
-- -----------------------------------------------------------------------------
-- Pega TODO este archivo en el SQL Editor de Supabase y ejecútalo. Se puede
-- volver a ejecutar sin problema (idempotente).
--
--   LIM    = departamento (ISO 3166-2:PE)      MIR = distrito (abreviatura)
--   000123 = número correlativo ÚNICO en todo el país (lo que hace único al código)
--
-- El código lo asigna la BD al insertar (el cliente no puede elegirlo ni
-- repetirlo) y nunca cambia después. Los reportes existentes se numeran por
-- fecha de creación.
--
-- ⚠️ La abreviatura está duplicada en src/data/incidentCode.js (modo demo):
-- si cambias una, cambia la otra.
-- =============================================================================

-- 1) Columnas y secuencia ----------------------------------------------------
create sequence if not exists public.incident_number_seq;

alter table public.incidents add column if not exists number bigint;
alter table public.incidents add column if not exists code text;

-- 2) Abreviaturas ------------------------------------------------------------
-- Mayúsculas, sin tildes, Ñ -> N. (Se quitan las tildes ANTES de upper(),
-- porque upper() no convierte letras con tilde en algunas configuraciones.)
create or replace function public.incident_plain(s text)
returns text language sql immutable as $$
  select btrim(upper(translate(coalesce(s, ''),
    'ÁÀÉÈÍÌÓÒÚÙÜÑáàéèíìóòúùüñ', 'AAEEIIOOUUUNaaeeiioouuun')))
$$;

-- Departamento -> código ISO 3166-2:PE (PER si no se conoce).
create or replace function public.incident_dept_code(dep text)
returns text language sql immutable as $$
  select case public.incident_plain(dep)
    when 'AMAZONAS' then 'AMA'      when 'ANCASH' then 'ANC'
    when 'APURIMAC' then 'APU'      when 'AREQUIPA' then 'ARE'
    when 'AYACUCHO' then 'AYA'      when 'CAJAMARCA' then 'CAJ'
    when 'CALLAO' then 'CAL'        when 'CUSCO' then 'CUS'
    when 'HUANCAVELICA' then 'HUV'  when 'HUANUCO' then 'HUC'
    when 'ICA' then 'ICA'           when 'JUNIN' then 'JUN'
    when 'LA LIBERTAD' then 'LAL'   when 'LAMBAYEQUE' then 'LAM'
    when 'LIMA' then 'LIM'          when 'LORETO' then 'LOR'
    when 'MADRE DE DIOS' then 'MDD' when 'MOQUEGUA' then 'MOQ'
    when 'PASCO' then 'PAS'         when 'PIURA' then 'PIU'
    when 'PUNO' then 'PUN'          when 'SAN MARTIN' then 'SAM'
    when 'TACNA' then 'TAC'         when 'TUMBES' then 'TUM'
    when 'UCAYALI' then 'UCA'
    else 'PER'
  end
$$;

-- Distrito -> abreviatura:
--   1 palabra -> 3 primeras letras (MIRAFLORES -> MIR)
--   2 palabras -> 1 + 2 letras     (SAN ISIDRO -> SIS)
--   3 o más -> iniciales           (SAN JUAN DE LURIGANCHO -> SJL)
-- Sin contar DE, DEL, LA, LAS, LOS, Y, EL, EN. Vacío -> OTR.
create or replace function public.incident_district_abbr(dist text)
returns text language plpgsql immutable as $$
declare
  w text;
  words text[] := '{}';
begin
  foreach w in array regexp_split_to_array(public.incident_plain(dist), '[\s-]+') loop
    w := regexp_replace(w, '[^A-Z]', '', 'g');
    if w <> '' and not (w = any (array['DE','DEL','LA','LAS','LOS','Y','EL','EN'])) then
      words := words || w;
    end if;
  end loop;
  if cardinality(words) = 0 then return 'OTR'; end if;
  if cardinality(words) = 1 then return left(words[1], 3); end if;
  if cardinality(words) = 2 then return left(words[1], 1) || left(words[2], 2); end if;
  return left(words[1], 1) || left(words[2], 1) || left(words[3], 1);
end;
$$;

create or replace function public.make_incident_code(dep text, dist text, num bigint)
returns text language sql immutable as $$
  select public.incident_dept_code(dep) || '-' || public.incident_district_abbr(dist)
         || '-' || lpad(num::text, 6, '0')
$$;

-- 3) Numerar los reportes que ya existen (por fecha de creación) -------------
update public.incidents i
   set number = o.n
  from (
    select id,
           (select coalesce(max(number), 0) from public.incidents)
             + row_number() over (order by created_at, id) as n
      from public.incidents
     where number is null
  ) o
 where i.id = o.id;

update public.incidents
   set code = public.make_incident_code(departamento, district, number)
 where code is null;

-- La secuencia sigue desde el último número usado.
select setval(
  'public.incident_number_seq',
  coalesce((select max(number) from public.incidents), 1),
  (select max(number) is not null from public.incidents)
);

alter table public.incidents alter column number set not null;
alter table public.incidents alter column code set not null;
create unique index if not exists incidents_number_key on public.incidents (number);
create unique index if not exists incidents_code_key on public.incidents (code);

-- 4) Al insertar: la BD asigna número y código (ignora lo que mande el cliente)
--    `security definer` porque el público no tiene permiso sobre la secuencia.
create or replace function public.assign_incident_code()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  new.number := nextval('public.incident_number_seq');
  new.code := public.make_incident_code(new.departamento, new.district, new.number);
  return new;
end;
$$;

drop trigger if exists trg_assign_code on public.incidents;
create trigger trg_assign_code
  before insert on public.incidents
  for each row execute function public.assign_incident_code();

-- 5) El código nunca cambia (aunque un revisor corrija el distrito después):
--    si no, el código que la persona guardó dejaría de funcionar.
create or replace function public.keep_incident_code()
returns trigger language plpgsql as $$
begin
  new.number := old.number;
  new.code := old.code;
  return new;
end;
$$;

drop trigger if exists trg_keep_code on public.incidents;
create trigger trg_keep_code
  before update on public.incidents
  for each row execute function public.keep_incident_code();
