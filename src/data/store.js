// =============================================================================
// Capa de datos (repositorio) — selector de backend
// -----------------------------------------------------------------------------
// Elige automáticamente el backend según haya o no credenciales de Supabase:
//   - Con credenciales  -> Supabase (Postgres real, compartido entre dispositivos)
//   - Sin credenciales  -> localStorage (demo en este navegador)
//
// Ambos backends exponen la MISMA interfaz async, así que la UI no cambia.
// Pega tus claves en .env y reinicia `npm run dev` para usar Supabase.
// =============================================================================

import { isSupabaseConfigured } from './supabaseClient.js'
import * as local from './localStore.js'
import * as remote from './supabaseStore.js'

const backend = isSupabaseConfigured ? remote : local

// Qué backend está activo (para mostrarlo en la UI).
export const DATA_SOURCE = isSupabaseConfigured ? 'supabase' : 'local'

export const listIncidents = backend.listIncidents
export const getIncident = backend.getIncident
export const findNearby = backend.findNearby
export const createIncident = backend.createIncident
export const updateStatus = backend.updateStatus
export const flagIncident = backend.flagIncident
export const restoreIncident = backend.restoreIncident
export const removeIncident = backend.removeIncident
export const getStats = backend.getStats

// Helpers puros (sin backend) — se re-exportan para no romper imports existentes.
export { ageDays, distanceMeters, computeStats } from './helpers.js'
