-- =============================================================================
-- SemáforoAlerta — datos de demostración
-- -----------------------------------------------------------------------------
-- Pega y ejecuta en el SQL Editor de Supabase (una vez). Inserta ~10 incidencias
-- realistas en Lima, con distintos estados, fechas e historial, para que el mapa
-- y el panel de transparencia se vean con vida.
--
-- Para BORRAR estos datos de demo después, ejecuta al final:
--   delete from public.incidents where id::text like '00000000-0000-0000-0000-0000000000%';
-- =============================================================================

-- El trigger crea un evento inicial automáticamente; lo desactivamos para
-- insertar el historial completo con fechas reales.
alter table public.incidents disable trigger trg_initial_status;

insert into public.incidents (id, title, description, fault_type, district, lat, lng, status, created_at) values
('00000000-0000-0000-0000-000000000001', 'Av. Javier Prado con Av. Arequipa', 'Semáforo apagado por completo. Cruce muy peligroso en hora punta.', 'apagado', 'Lince', -12.0905, -77.0364, 'reported', now() - interval '43 days'),
('00000000-0000-0000-0000-000000000002', 'Óvalo Gutiérrez', 'El semáforo peatonal queda pegado en rojo; la gente cruza con los autos en movimiento.', 'pegado', 'Miraflores', -12.1145, -77.0353, 'acknowledged', now() - interval '57 days'),
('00000000-0000-0000-0000-000000000003', 'Av. La Marina con Av. Universitaria', 'Solo parpadea en ámbar todo el día. Falta sincronización.', 'intermitente', 'San Miguel', -12.0772, -77.0817, 'in_progress', now() - interval '75 days'),
('00000000-0000-0000-0000-000000000004', 'Av. Aviación con Av. Canadá', 'Poste de semáforo chocado, quedó inclinado y sin funcionar.', 'dañado', 'San Borja', -12.0876, -77.0011, 'resolved', now() - interval '124 days'),
('00000000-0000-0000-0000-000000000005', 'Av. Brasil con Av. Pershing', 'Apagado en las noches, peligroso para quienes salen tarde.', 'apagado', 'Magdalena', -12.0905, -77.0593, 'reported', now() - interval '6 days'),
('00000000-0000-0000-0000-000000000006', 'Av. Angamos con Av. Tomás Marsano', 'Tiempos descoordinados, se forman colas enormes.', 'desfasado', 'Surco', -12.1180, -76.9950, 'resolved', now() - interval '90 days'),
('00000000-0000-0000-0000-000000000007', 'Av. Aviación con Av. México', 'Totalmente apagado hace meses. Nadie responde.', 'apagado', 'La Victoria', -12.0780, -77.0090, 'reported', now() - interval '112 days'),
('00000000-0000-0000-0000-000000000008', 'Av. Próceres con Av. Las Flores', 'Estructura dañada tras un choque, cables expuestos.', 'dañado', 'San Juan de Lurigancho', -12.0050, -76.9990, 'in_progress', now() - interval '38 days'),
('00000000-0000-0000-0000-000000000009', 'Av. Abancay con Nicolás de Piérola', 'Pegado en verde para los autos; los peatones no pueden cruzar.', 'pegado', 'Cercado de Lima', -12.0500, -77.0320, 'resolved', now() - interval '60 days'),
('00000000-0000-0000-0000-000000000010', 'Av. Salaverry con Av. Javier Prado', 'Reporte repetido del mismo semáforo.', 'apagado', 'Jesús María', -12.0890, -77.0490, 'duplicate', now() - interval '20 days');

-- Historial de cambios de estado (con fechas coherentes).
insert into public.status_changes (incident_id, status, note, at) values
-- 1) reportado, sin atender
('00000000-0000-0000-0000-000000000001', 'reported', 'Reporte ciudadano', now() - interval '43 days'),
-- 2) revisado
('00000000-0000-0000-0000-000000000002', 'reported', 'Reporte ciudadano', now() - interval '57 days'),
('00000000-0000-0000-0000-000000000002', 'acknowledged', 'Confirmado por la municipalidad', now() - interval '50 days'),
-- 3) en reparación
('00000000-0000-0000-0000-000000000003', 'reported', 'Reporte ciudadano', now() - interval '75 days'),
('00000000-0000-0000-0000-000000000003', 'acknowledged', 'Confirmado', now() - interval '72 days'),
('00000000-0000-0000-0000-000000000003', 'in_progress', 'Cuadrilla asignada', now() - interval '65 days'),
-- 4) resuelto en 18 días
('00000000-0000-0000-0000-000000000004', 'reported', 'Reporte ciudadano', now() - interval '124 days'),
('00000000-0000-0000-0000-000000000004', 'acknowledged', 'Confirmado', now() - interval '122 days'),
('00000000-0000-0000-0000-000000000004', 'in_progress', 'Reparación iniciada', now() - interval '115 days'),
('00000000-0000-0000-0000-000000000004', 'resolved', 'Semáforo repuesto', now() - interval '106 days'),
-- 5) reportado reciente
('00000000-0000-0000-0000-000000000005', 'reported', 'Reporte ciudadano', now() - interval '6 days'),
-- 6) resuelto en 6 días
('00000000-0000-0000-0000-000000000006', 'reported', 'Reporte ciudadano', now() - interval '90 days'),
('00000000-0000-0000-0000-000000000006', 'acknowledged', 'Confirmado', now() - interval '88 days'),
('00000000-0000-0000-0000-000000000006', 'in_progress', 'Ajuste de tiempos', now() - interval '86 days'),
('00000000-0000-0000-0000-000000000006', 'resolved', 'Sincronización corregida', now() - interval '84 days'),
-- 7) reportado, MUY antiguo (112 días)
('00000000-0000-0000-0000-000000000007', 'reported', 'Reporte ciudadano', now() - interval '112 days'),
-- 8) en reparación
('00000000-0000-0000-0000-000000000008', 'reported', 'Reporte ciudadano', now() - interval '38 days'),
('00000000-0000-0000-0000-000000000008', 'acknowledged', 'Confirmado', now() - interval '30 days'),
('00000000-0000-0000-0000-000000000008', 'in_progress', 'Trabajos en curso', now() - interval '22 days'),
-- 9) resuelto en 25 días
('00000000-0000-0000-0000-000000000009', 'reported', 'Reporte ciudadano', now() - interval '60 days'),
('00000000-0000-0000-0000-000000000009', 'acknowledged', 'Confirmado', now() - interval '55 days'),
('00000000-0000-0000-0000-000000000009', 'in_progress', 'Reparación iniciada', now() - interval '45 days'),
('00000000-0000-0000-0000-000000000009', 'resolved', 'Semáforo operativo', now() - interval '35 days'),
-- 10) duplicado
('00000000-0000-0000-0000-000000000010', 'reported', 'Reporte ciudadano', now() - interval '20 days'),
('00000000-0000-0000-0000-000000000010', 'duplicate', 'Ya existe un reporte de este semáforo', now() - interval '18 days');

-- Reactivamos el trigger para los reportes reales que vendrán de la app.
alter table public.incidents enable trigger trg_initial_status;
