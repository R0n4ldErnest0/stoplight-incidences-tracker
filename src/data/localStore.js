// Backend local (localStorage) — para el demo sin backend.
// Implementa la MISMA interfaz async que supabaseStore.js.

import { SEED_INCIDENTS } from './seed.js'
import { distanceMeters, computeStats } from './helpers.js'

const STORAGE_KEY = 'semaforo-alerta:incidents:v1'

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
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

export async function listIncidents() {
  return load()
    .filter((i) => !i.hidden) // el contenido muy reportado se oculta del público
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export async function getIncident(id) {
  return load().find((i) => i.id === id) || null
}

export async function findNearby({ lat, lng }, radius = 60) {
  return load().filter(
    (i) =>
      !i.hidden &&
      i.status !== 'resolved' &&
      i.status !== 'duplicate' &&
      distanceMeters({ lat, lng }, { lat: i.lat, lng: i.lng }) <= radius
  )
}

export async function createIncident(input) {
  const incidents = load()
  const now = new Date().toISOString()
  // Acepta varias fotos (`photos`) o una sola (`photo`, compatibilidad).
  const photos = input.photos?.length
    ? input.photos
    : input.photo
      ? [input.photo]
      : []
  const incident = {
    id: genId(),
    title: input.title?.trim() || 'Semáforo sin nombre de cruce',
    description: input.description?.trim() || '',
    faultType: input.faultType || 'otro',
    district: input.district || 'Otro',
    lat: input.lat,
    lng: input.lng,
    status: 'reported',
    photos,
    photo: photos[0] || null, // alias de la principal (miniaturas de lista/mapa)
    flags: 0,
    hidden: false,
    createdAt: now,
    history: [{ status: 'reported', at: now, note: 'Reporte ciudadano' }],
  }
  incidents.push(incident)
  save(incidents)
  return incident
}

export async function updateStatus(id, status, note = '') {
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

// Reporta un incidente como abuso. Al 5º reporte se oculta del público, igual
// que en el backend Supabase (ver flag_incident en schema.sql).
export async function flagIncident(id) {
  const incidents = load()
  const idx = incidents.findIndex((i) => i.id === id)
  if (idx === -1) return null
  const flags = (incidents[idx].flags || 0) + 1
  incidents[idx] = { ...incidents[idx], flags, hidden: flags >= 5 }
  save(incidents)
  return { id, flags }
}

export async function getStats() {
  return computeStats(load().filter((i) => !i.hidden))
}
