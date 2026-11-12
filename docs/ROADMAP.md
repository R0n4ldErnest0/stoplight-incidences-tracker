# Roadmap — SemáforoAlerta

Lista viva de lo pendiente, con las decisiones ya tomadas. Lo terminado se registra en el
historial de git.

## Panel de Transparencia

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

- [ ] Protección contra bots y reportes falsos (Cloudflare Turnstile verificado en servidor,
      límites de uso, subida de fotos controlada).
- [ ] Moderación con IA con umbrales: retiro automático sobre un valor alto (reversible),
      revisión humana en la zona intermedia.
- [ ] Recomprimir las fotos antiguas (subidas antes de la compresión, ~2,8 MB c/u).

## Otros

- [ ] Detección de reportes del mismo semáforo (agrupar por cercanía ~30 m).
- [ ] Más canales de WhatsApp de autoridades (`AUTHORITIES` en `src/data/whatsapp.js`).
