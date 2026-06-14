// =============================================================================
// Capa de datos (repositorio)
// -----------------------------------------------------------------------------
// Hoy guarda todo en localStorage para que el demo funcione sin backend.
// La interfaz pública (listIncidents, createIncident, updateStatus, ...) está
// pensada para que mañana puedas reemplazar la implementación por llamadas a
// Supabase/PostGIS SIN tocar los componentes de React.
//
// Para migrar a Supabase: reemplaza el cuerpo de cada función por la llamada
// equivalente (`supabase.from('incidents').select()`, etc.) manteniendo la
// misma firma y forma de los datos.
// =============================================================================

import { SEED_INCIDENTS } from './seed.js'

const STORAGE_KEY = 'semaforo-alerta:incidents:v1'

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      // Primera vez: sembramos datos de ejemplo.
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_INCIDENTS))
      return [...SEED_INCIDENTS]
    }
    return JSON.parse(raw)
  } catch (err) {
    console.error('No se pudo leer el almacenamiento local:', err)
    return [...SEED_INCIDENTS]
  }
}

function save(incidents) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(incidents))
}

function genId() {
  return 'inc-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7)
}

// --- Distancia en metros entre dos coordenadas (fórmula de Haversine) --------
// Útil para detectar reportes duplicados cercanos. En Supabase esto lo haría
// PostGIS con ST_DWithin.
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

// --- API pública del repositorio --------------------------------------------

export function listIncidents() {
  return load().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export function getIncident(id) {
  return load().find((i) => i.id === id) || null
}

// Devuelve incidencias activas a menos de `radius` metros de un punto.
// Pensado para avisar "ya existe un reporte cerca" antes de crear uno nuevo.
export function findNearby({ lat, lng }, radius = 60) {
  return load().filter(
    (i) =>
      i.status !== 'resolved' &&
      i.status !== 'duplicate' &&
      distanceMeters({ lat, lng }, { lat: i.lat, lng: i.lng }) <= radius
  )
}

export function createIncident(input) {
  const incidents = load()
  const now = new Date().toISOString()
  const incident = {
    id: genId(),
    title: input.title?.trim() || 'Semáforo sin nombre de cruce',
    description: input.description?.trim() || '',
    faultType: input.faultType || 'otro',
    district: input.district || 'Otro',
    lat: input.lat,
    lng: input.lng,
    status: 'reported',
    photo: input.photo || null, // dataURL en el demo; en prod sería una URL de Storage
    createdAt: now,
    history: [{ status: 'reported', at: now, note: 'Reporte ciudadano' }],
  }
  incidents.push(incident)
  save(incidents)
  return incident
}

export function updateStatus(id, status, note = '') {
  const incidents = load()
  const idx = incidents.findIndex((i) => i.id === id)
  if (idx === -1) return null
  const now = new Date().toISOString()
  incidents[idx] = {
    ...incidents[idx],
    status,
    history: [...incidents[idx].history, { status, at: now, note }],
  }
  save(incidents)
  return incidents[idx]
}

// Estadísticas simples para el panel de transparencia.
export function getStats() {
  const incidents = load()
  const byStatus = {}
  for (const i of incidents) byStatus[i.status] = (byStatus[i.status] || 0) + 1

  // Días promedio hasta resolución (sobre las resueltas).
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

// Edad de una incidencia en días (para resaltar las que llevan mucho tiempo).
export function ageDays(incident) {
  return Math.floor((Date.now() - new Date(incident.createdAt)) / 86400000)
}
