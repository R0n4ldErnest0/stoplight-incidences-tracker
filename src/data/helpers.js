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

const ACTIVE_STATUSES = ['reported', 'acknowledged', 'in_progress']
export const isActive = (i) => ACTIVE_STATUSES.includes(i.status)

// Días que tardó en resolverse (de creación al evento 'resolved').
export function resolveDays(incident) {
  const created = new Date(incident.createdAt)
  const resolvedEvent = [...incident.history].reverse().find((h) => h.status === 'resolved')
  if (!resolvedEvent) return null
  return Math.round((new Date(resolvedEvent.at) - created) / 86400000)
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

// Métricas completas para el panel de transparencia / rendición de cuentas.
export function computeDashboard(incidents) {
  const total = incidents.length
  const active = incidents.filter(isActive)
  const resolved = incidents.filter((i) => i.status === 'resolved')

  const resolutionRate = total ? Math.round((resolved.length / total) * 100) : 0

  // Tasa de respuesta: incidencias que salieron de "solo reportado".
  const responded = incidents.filter(
    (i) => i.status !== 'reported' && i.status !== 'duplicate'
  )
  const responseRate = total ? Math.round((responded.length / total) * 100) : 0

  // Promedio de días en resolverse.
  const resolveTimes = resolved.map(resolveDays).filter((d) => d != null)
  const avgDays = resolveTimes.length
    ? Math.round(resolveTimes.reduce((a, b) => a + b, 0) / resolveTimes.length)
    : null

  // Semáforos activos más antiguos (lo que crea presión).
  const oldestUnresolved = [...active]
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .slice(0, 6)

  // Conteo por estado.
  const byStatus = {}
  for (const i of incidents) byStatus[i.status] = (byStatus[i.status] || 0) + 1

  // Conteo por tipo de falla.
  const byFault = {}
  for (const i of incidents) byFault[i.faultType] = (byFault[i.faultType] || 0) + 1

  // Desglose por distrito.
  const districts = {}
  for (const i of incidents) {
    const d = i.district || 'Otro'
    if (!districts[d]) {
      districts[d] = {
        district: d, total: 0, active: 0, resolved: 0, _sum: 0, _n: 0,
        _lat: 0, _lng: 0, _pts: 0, _alat: 0, _alng: 0, _apts: 0,
      }
    }
    const e = districts[d]
    e.total++
    if (Number.isFinite(i.lat) && Number.isFinite(i.lng)) {
      e._lat += i.lat; e._lng += i.lng; e._pts++
      if (isActive(i)) { e._alat += i.lat; e._alng += i.lng; e._apts++ }
    }
    if (isActive(i)) e.active++
    if (i.status === 'resolved') {
      e.resolved++
      const rd = resolveDays(i)
      if (rd != null) {
        e._sum += rd
        e._n++
      }
    }
  }
  const byDistrict = Object.values(districts)
    .map((e) => ({
      district: e.district,
      total: e.total,
      active: e.active,
      resolved: e.resolved,
      avgDays: e._n ? Math.round(e._sum / e._n) : null,
      // Centro de los reportes pendientes (o de todos, si no hay pendientes):
      // ubica la burbuja del distrito en el mapa sin necesitar sus límites.
      lat: e._apts ? e._alat / e._apts : e._pts ? e._lat / e._pts : null,
      lng: e._apts ? e._alng / e._apts : e._pts ? e._lng / e._pts : null,
    }))
    .sort((a, b) => b.active - a.active || b.total - a.total)

  return {
    total,
    active: active.length,
    resolved: resolved.length,
    resolutionRate,
    responseRate,
    avgDays,
    oldestUnresolved,
    byStatus,
    byFault,
    byDistrict,
  }
}

// Mes 'YYYY-MM' de una fecha ISO (hora local).
function monthKey(iso) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Evolución mensual: reportes nuevos vs resueltos por mes, del primer reporte
// al mes actual (máx. los últimos `maxMonths`). Un reporte cuenta como
// resuelto en el mes de su evento 'resolved' del historial.
export function computeMonthlyTrend(incidents, maxMonths = 12) {
  if (!incidents.length) return []
  const created = {}
  const resolved = {}
  let first = Infinity
  for (const i of incidents) {
    const t = new Date(i.createdAt).getTime()
    if (t < first) first = t
    const k = monthKey(i.createdAt)
    created[k] = (created[k] || 0) + 1
    const ev = [...(i.history || [])].reverse().find((h) => h.status === 'resolved')
    if (i.status === 'resolved' && ev) {
      const rk = monthKey(ev.at)
      resolved[rk] = (resolved[rk] || 0) + 1
    }
  }
  const months = []
  const now = new Date()
  const cursor = new Date(new Date(first).getFullYear(), new Date(first).getMonth(), 1)
  while (cursor <= now) {
    const k = monthKey(cursor.toISOString())
    months.push({
      key: k,
      date: new Date(cursor),
      created: created[k] || 0,
      resolved: resolved[k] || 0,
    })
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return months.slice(-maxMonths)
}

// Antigüedad de los reportes pendientes, en tramos ordenados.
export const AGE_BANDS = [
  { key: '0-7', label: '0–7 días', min: 0, max: 7 },
  { key: '8-30', label: '8–30 días', min: 8, max: 30 },
  { key: '31-90', label: '31–90 días', min: 31, max: 90 },
  { key: '90+', label: 'Más de 90 días', min: 91, max: Infinity },
]

export function computeAgeBands(incidents) {
  const active = incidents.filter(isActive)
  return AGE_BANDS.map((b) => {
    const count = active.filter((i) => {
      const a = ageDays(i)
      return a >= b.min && a <= b.max
    }).length
    return { ...b, count, share: active.length ? count / active.length : 0 }
  })
}
