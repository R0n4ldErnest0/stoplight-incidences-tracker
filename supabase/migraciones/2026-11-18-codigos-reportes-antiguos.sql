-- =============================================================================
-- Corrección única (2026-11-18): códigos de los reportes antiguos
-- -----------------------------------------------------------------------------
-- Correr DESPUÉS de 2026-11-18-codigo-de-reporte.sql, una sola vez, ANTES de
-- publicar la app que muestra los códigos (nadie los ha visto todavía).
--
-- Problema: los reportes de febrero a junio de 2026 son anteriores a los
-- desplegables de Departamento/Provincia, así que esos campos están vacíos y su
-- código salió como PER-... Además usaban la lista vieja de distritos, con
-- nombres que no son los oficiales (INEI/UBIGEO):
--     Surco           -> SANTIAGO DE SURCO   (el oficial; "Surco" a secas es
--                                             otro distrito, en Huarochirí)
--     Magdalena       -> MAGDALENA DEL MAR
--     Cercado de Lima -> LIMA                (el distrito se llama "Lima")
-- Los reportes nuevos ya guardan el nombre oficial, así que con dos nombres
-- para el mismo distrito el filtro de la Lista y el panel de Transparencia los
-- contaban como distritos distintos.
--
-- Qué hace (solo en reportes SIN departamento cuyo distrito existe en la
-- provincia de Lima): pone Lima/Lima, el nombre oficial del distrito y
-- recalcula el código CONSERVANDO su número. Desactiva la protección "el
-- código nunca cambia" solo dentro de esta transacción.
--
-- Se puede volver a ejecutar: la segunda vez no encuentra nada que corregir.
-- =============================================================================

begin;
alter table public.incidents disable trigger trg_keep_code;

with m as (
  select id,
         case public.incident_plain(district)
           when 'SURCO' then 'SANTIAGO DE SURCO'
           when 'MAGDALENA' then 'MAGDALENA DEL MAR'
           when 'CERCADO DE LIMA' then 'LIMA'
           when 'CERCADO' then 'LIMA'
           else public.incident_plain(district)
         end as dist
    from public.incidents
   where coalesce(departamento, '') = ''
)
update public.incidents i
   set departamento = 'LIMA',
       provincia    = 'LIMA',
       district     = m.dist,
       code = public.make_incident_code('LIMA', 'LIMA', m.dist, i.number)
  from m
 where i.id = m.id
   and exists (select 1 from public.district_codes d
                where d.departamento = 'LIMA' and d.provincia = 'LIMA' and d.distrito = m.dist);

alter table public.incidents enable trigger trg_keep_code;
commit;

-- Resultado: no debería quedar ningún código PER-.
select number, code, departamento, district, removed_at is not null as retirado
  from public.incidents
 order by number;
