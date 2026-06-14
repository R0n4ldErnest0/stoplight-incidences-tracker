// Backend Supabase — implementa la MISMA interfaz async que localStore.js.
// La UI no sabe cuál de los dos está en uso (ver store.js).

import { supabase } from './supabaseClient.js'
import { distanceMeters, computeStats } from './helpers.js'

const PHOTO_BUCKET = 'incident-photos'

// Convierte una fila de la BD al formato que usa la app.
function mapRow(row) {
  const history = (row.status_changes || [])
    .slice()
    .sort((a, b) => new Date(a.at) - new Date(b.at))
    .map((h) => ({ status: h.status, at: h.at, note: h.note || '' }))
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    faultType: row.fault_type || 'otro',
    district: row.district || 'Otro',
    lat: row.lat,
    lng: row.lng,
    status: row.status,
    photo: row.photo_url || null,
    createdAt: row.created_at,
    history: history.length
      ? history
      : [{ status: row.status, at: row.created_at, note: '' }],
  }
}

const SELECT = '*, status_changes(*)'

// dataURL (de la cámara) -> Blob, para subir a Storage.
function dataUrlToBlob(dataUrl) {
  const [meta, b64] = dataUrl.split(',')
  const mime = meta.match(/:(.*?);/)?.[1] || 'image/jpeg'
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

async function uploadPhoto(dataUrl) {
  if (!dataUrl) return null
  const blob = dataUrlToBlob(dataUrl)
  const ext = (blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg')
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, blob, {
    contentType: blob.type,
    upsert: false,
  })
  if (error) throw error
  const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export async function listIncidents() {
  const { data, error } = await supabase
    .from('incidents')
    .select(SELECT)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(mapRow)
}

export async function getIncident(id) {
  const { data, error } = await supabase
    .from('incidents')
    .select(SELECT)
    .eq('id', id)
    .single()
  if (error) return null
  return mapRow(data)
}

// Cercanía: traemos las activas y filtramos por Haversine en el cliente.
// (Con PostGIS se podría hacer con un RPC ST_DWithin; ver supabase/schema.sql.)
export async function findNearby({ lat, lng }, radius = 60) {
  const { data, error } = await supabase
    .from('incidents')
    .select(SELECT)
    .in('status', ['reported', 'acknowledged', 'in_progress'])
  if (error) throw error
  return data
    .map(mapRow)
    .filter((i) => distanceMeters({ lat, lng }, { lat: i.lat, lng: i.lng }) <= radius)
}

export async function createIncident(input) {
  const photoUrl = await uploadPhoto(input.photo)

  const { data: inc, error } = await supabase
    .from('incidents')
    .insert({
      title: input.title?.trim() || 'Semáforo sin nombre de cruce',
      description: input.description?.trim() || '',
      fault_type: input.faultType || 'otro',
      district: input.district || 'Otro',
      lat: input.lat,
      lng: input.lng,
      status: 'reported',
      photo_url: photoUrl,
    })
    .select()
    .single()
  if (error) throw error

  // El primer evento del historial lo crea automáticamente un trigger en la BD
  // (ver supabase/schema.sql), así el cliente anónimo no escribe en status_changes.
  return getIncident(inc.id)
}

export async function updateStatus(id, status, note = '') {
  const { error: e1 } = await supabase.from('incidents').update({ status }).eq('id', id)
  if (e1) throw e1
  const { error: e2 } = await supabase
    .from('status_changes')
    .insert({ incident_id: id, status, note })
  if (e2) throw e2
  return getIncident(id)
}

export async function getStats() {
  const incidents = await listIncidents()
  return computeStats(incidents)
}
