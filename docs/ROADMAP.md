# Roadmap — SemáforoAlerta

Lista viva de lo pendiente, con las decisiones ya tomadas. Lo terminado se registra en el
historial de git.

## Panel de Transparencia

- [ ] **Tarjetas en rojo según el desempeño de la autoridad** (pendiente de decisión,
  2026-11-18). Colorear solo cuando el valor indica mal desempeño, con el umbral explicado
  en el «?» de cada tarjeta. Propuesta: tasa de resolución < 50 %, tasa de respuesta < 70 %,
  promedio de días > 30, sin resolver > mitad del total. Falta decidir los umbrales y si
  también se usa verde cuando va bien (resolución ≥ 80 %, respuesta ≥ 90 %, ≤ 7 días).

Aprobado, pendiente de implementar:

- [ ] **Tipos de falla como barra segmentada** (una barra horizontal dividida en partes de
      color, con el % impreso en cada parte; colores validados para daltonismo).
- [ ] **Un solo botón «?» junto al título** del panel, que abre «Cómo se calculan estas
      cifras» con todas las definiciones; quitar los «?» de cada tarjeta y sección y agregar
      subtítulos breves para que cada cifra se entienda sola.
- [ ] **Dos tarjetas nuevas de respuesta de la autoridad:**
      «Días prom. esperando respuesta» (reportes que siguen en Reportado: días desde su
      creación) y «Días prom. hasta la primera respuesta» (días hasta el primer cambio de estado).
- [ ] **Marcar como duplicado cuenta como respuesta** de la autoridad (Tasa de respuesta y
      las tarjetas anteriores).
- [ ] **«¿Cuánto llevan esperando?» apilado por estado** (Reportado abajo, luego Revisado y
      En reparación), para ver cuántos reportes no tuvieron ninguna respuesta.
- [ ] **Conteo público de reportes retirados por moderación**, por motivo. Necesita una
      función SQL `security definer` que devuelva solo conteos (el público no puede leer los
      reportes retirados) y un método nuevo en ambos backends.

Mejora futura:

- [ ] **Mapa por distrito: coropleta (Lima y Callao) + barras ordenadas**, y más adelante el
      Perú por departamento. Elección más probable según el análisis en
      [`analisis/mapa-por-distrito.md`](analisis/mapa-por-distrito.md). Por ahora se mantienen
      las burbujas.

## Seguridad y moderación

Contexto: la clave pública (anon) de Supabase viaja en el código del sitio (es lo normal);
la protección real son las reglas de la BD (RLS) y, para frenar abusos, un paso verificado
en servidor.

- [x] **Fase 0 — la BD exige las reglas del formulario** (2026-11-12, aplicada en producción):
      reportes nuevos solo «limpios» (Reportado, sin marcas, fecha actual), largos de texto,
      tipos de falla válidos, coordenadas dentro del Perú, máx. 3 fotos y solo de nuestro
      bucket; bucket solo imágenes JPEG/PNG/WebP de hasta 5 MB.
      Ver [`supabase/migraciones/2026-11-12-fase0-seguridad.sql`](../supabase/migraciones/2026-11-12-fase0-seguridad.sql).
- [ ] **Confirmar en producción** que un reporte real con foto se publica bien tras la Fase 0.
- [ ] **Fase 1 — verificación humana (Turnstile) + límites de uso.** Pendiente decidir dónde
      se verifica el token (necesita la clave secreta, nunca en el navegador):
      - A · API propia en el VPS (requiere dominio con HTTPS),
      - B · función de Vercel,
      - C · Edge Function de Supabase,
      - **D · sesión anónima de Supabase con CAPTCHA** (Supabase verifica Turnstile; sin
        servidor propio) — *recomendada para empezar*.
      Con D: la BD solo acepta reportes/marcas de sesiones verificadas, máx. ~5 reportes por
      hora por sesión y **una marca por sesión por reporte**.
      Requiere una cuenta gratuita de Cloudflare (claves de Turnstile).
      Alternativa sin terceros: ALTCHA (prueba de trabajo, alojado en el VPS).
- [ ] **Hueco abierto hasta la Fase 1:** `flag_incident` se puede llamar repetidamente
      (2 marcas ocultan un reporte). Mitigación actual: restaurar desde Moderación.
- [ ] **Fase 2 — moderación con IA** (en el VPS o como función): puntaje por reporte;
      ≥ 0,9 retiro automático (reversible, fotos conservadas hasta confirmación humana salvo
      contenido explícito), 0,5–0,9 oculto + cola de Moderación con el motivo, < 0,5 publicado.
      Revisar con IA también los reportes marcados (para que las marcas solas no oculten un
      reporte legítimo). Opciones: Claude Haiku (~0,5 USD por 1000 reportes, explica sus
      decisiones) o modelos locales gratuitos en el VPS (CLIP + detector NSFW, 2–4 GB de RAM).
      Pendiente: datos del VPS (SO, RAM, CPU, GPU) y si hay dominio.
- [ ] **Fase 3** — fotos repetidas (hash perceptual), GPS vs. pin, confirmaciones «yo también
      lo vi».
- [ ] Recomprimir las fotos antiguas (subidas antes de la compresión, ~2,8 MB c/u, ~38 MB en
      total); requiere la clave `service_role` solo en un entorno local.

## Seguimiento de reportes

- [ ] **Código de reporte en producción** (`LIM-MIR-000123`): correr
  `supabase/migraciones/2026-11-18-codigo-de-reporte.sql` en Supabase y subir la app.
- [ ] **«Mis reportes» en la BD** (fase 1 de seguridad): con la sesión anónima de Supabase,
  guardar el id de sesión en cada reporte; hoy se guarda solo en el dispositivo.
- [ ] **Búsqueda y páginas en el servidor** cuando haya varios miles de reportes (hoy se
  descargan todos y se filtra en el navegador), y agrupar los pines cercanos del mapa.

## Otros

- [ ] Detección de reportes del mismo semáforo (agrupar por cercanía ~30 m).
- [ ] Más canales de WhatsApp de autoridades (`AUTHORITIES` en `src/data/whatsapp.js`).
