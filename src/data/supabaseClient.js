// Cliente de Supabase.
// Se crea sólo si hay credenciales en el .env. Si no, la app cae a datos
// locales (demo) y todo sigue funcionando.

import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

// Configurado sólo si ambas variables existen y no son el placeholder.
export const isSupabaseConfigured = Boolean(
  url && anonKey && !url.includes('TU-PROYECTO') && anonKey !== 'tu-anon-public-key'
)

export const supabase = isSupabaseConfigured ? createClient(url, anonKey) : null

// Prueba rápida de conexión: cuenta filas en la tabla incidents.
export async function testConnection() {
  if (!supabase) return { ok: false, reason: 'no-config' }
  const { error, count } = await supabase
    .from('incidents')
    .select('*', { count: 'exact', head: true })
  if (error) return { ok: false, reason: error.message }
  return { ok: true, count: count ?? 0 }
}
