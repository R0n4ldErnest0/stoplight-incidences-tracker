// Link compartible de un reporte. La app no tiene router (SPA simple), así
// que usamos un query param (?id=) leído/escrito a mano con la History API
// en vez de agregar una librería de rutas. Ver useBackClose.js para cómo el
// modal de detalle sincroniza este param con el botón "atrás".
const ID_PARAM = 'id'

export function buildIncidentUrl(id) {
  const url = new URL(window.location.origin + window.location.pathname)
  url.searchParams.set(ID_PARAM, id)
  return url.toString()
}

export function getIncidentIdFromUrl() {
  return new URLSearchParams(window.location.search).get(ID_PARAM)
}
