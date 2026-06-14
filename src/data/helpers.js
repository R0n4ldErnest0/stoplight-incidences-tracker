// Funciones puras compartidas por ambos backends (local y Supabase).

// Distancia en metros entre dos coordenadas (Haversine).
export function distanceMeters(a, b) {
  const R = 6371000
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

// Edad de una incidencia en días.
export function ageDays(incident) {
  return Math.floor((Date.now() - new Date(incident.createdAt)) / 86400000)
}

// Estadísticas para el panel de transparencia, a partir de una lista.
export function computeStats(incidents) {
  const byStatus = {}
  for (const i of incidents) byStatus[i.status] = (byStatus[i.status] || 0) + 1

  const resolved = incidents.filter((i) => i.status === 'resolved')
  let avgDays = null
  if (resolved.length) {
    const totalMs = resolved.reduce((sum, i) => {
      const created = new Date(i.history[0].at)
      const done = new Date(i.history[i.history.length - 1].at)
      return sum + (done - created)
    }, 0)
    avgDays = Math.round(totalMs / resolved.length / 86400000)
  }

  return { total: incidents.length, byStatus, avgDays }
}
