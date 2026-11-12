# Mapa por distrito (panel de Transparencia) — análisis de alternativas

**Fecha:** 2026-11-12 · **Estado:** decidido mantener las burbujas por ahora; mejora pendiente.

Comparación visual con datos de ejemplo: [`mapa-por-distrito-alternativas.html`](mapa-por-distrito-alternativas.html)
(abrir en el navegador; pasar el cursor sobre un distrito o círculo muestra su número).

## Problema

El mapa actual (burbujas proporcionales, `DistrictBubbleMap` en `src/components/DashboardCharts.jsx`)
hace difícil saber qué distrito tiene más reportes sin resolver cuando las burbujas se juntan o
tienen tamaños parecidos.

## Alternativas evaluadas

| Opción | ¿Todo el Perú? | ¿Se ve qué distrito tiene más? | Notas |
|---|---|---|---|
| **A · Burbujas proporcionales** (actual) | Sí (solo usa coordenadas) | Difícil si se juntan | Sin archivos extra. |
| **B · Coropleta por distrito** («mapa de temperatura») | Solo Lima y Callao por ahora | Bien, con leyenda | Necesita límites distritales (126 KB, carga diferida). Los distritos grandes llaman más la atención. |
| **C · Mapa de calor (densidad)** | Sí | No (zonas, no distritos) | Requiere `leaflet.heat`; con pocos reportes se ven manchas sueltas. |
| **D · Barras ordenadas por distrito** | Sí (no es mapa) | Exacto | Mostrar top 10 + «Ver todos». |
| **E · Perú por departamento** (dos niveles) | Sí | Entre departamentos; al tocar, sus distritos | Para cuando haya reportes fuera de Lima. |

## Recomendación (elección más probable)

- **Ahora: B + D.** Coropleta de Lima y Callao para ver *dónde*, y barras ordenadas para saber
  *exactamente* qué distrito tiene más. Hoy todos los reportes son de Lima.
- **Más adelante: E**, cuando lleguen reportes de otras regiones (la app ya permite elegir
  cualquier distrito del Perú). Mientras tanto, los reportes fuera de Lima y Callao irían en las
  barras/tabla, con una nota bajo el mapa indicando cuántos son.
- **Descartado: C**, no responde «qué distrito tiene más» y agrega una dependencia.

## Notas técnicas para cuando se implemente B

- **Fuente de límites:** `lima_callao_distritos.geojson` de
  [joseluisq/peru-geojson-datasets](https://github.com/joseluisq/peru-geojson-datasets)
  (IGN, licencia Apache-2.0 — citar la fuente). 50 distritos, incluye Mi Perú y Pueblo Libre con
  sus nombres actuales. ~1,7 MB / 72 000 vértices en bruto.
- **Generar el archivo de la app:** `python build_lima_callao_geojson.py <fuente.geojson> src/data/lima-callao-distritos.json`
  (requiere `shapely`). Simplifica a ~20 m (tolerancia 0.0002°), redondea a 5 decimales y corrige
  los nombres con tildes rotas en la fuente (BREÑA, MI PERÚ). Resultado: ~126 KB (~33 KB gzip).
  Cargarlo con `import()` dinámico solo al abrir Transparencia.
- **Emparejar nombres** (los reportes usan nombres comunes, el mapa los oficiales): normalizar
  (sin tildes, mayúsculas) y aplicar alias: `CERCADO DE LIMA`/`CERCADO` → `LIMA`,
  `MAGDALENA` → `MAGDALENA DEL MAR`, `SURCO` → `SANTIAGO DE SURCO`,
  `CARMEN DE LA LEGUA` → `CARMEN DE LA LEGUA REYNOSO`. Solo considerar reportes con provincia
  Lima/Callao o sin provincia (hay distritos homónimos en otras regiones, p. ej. Miraflores en
  Arequipa). Usar la misma clave para agrupar la tabla «Por distrito» (hoy «Surco» y
  «Santiago de Surco» salen como filas distintas).
- **Escala:** tramos «redondos» recalculados con cada filtro de fechas (p. ej. 0 · 1–2 · 3–4 · 5),
  gris claro para 0 y la rampa azul validada `#86b6ef, #3987e5, #1c5cab, #0d366b`, con leyenda.
- **Opción E:** los límites departamentales pueden salir de
  [juaneladio/peru-geojson](https://github.com/juaneladio/peru-geojson) (`peru_distrital_simple.geojson`,
  INEI 2007) disolviendo por departamento. Ojo: esa versión no tiene forma para Santa Anita ni
  La Punta, así que no sirve para el nivel distrital de Lima.
