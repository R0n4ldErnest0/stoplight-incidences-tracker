// Autenticación con Supabase Auth.
// Maneja login, logout, state, y verifica si el usuario actual es reviewer.

import { supabase, isSupabaseConfigured } from './supabaseClient.js'

// Estado global de auth (observable).
let authState = { user: null, session: null, isReviewer: false, loading: true }
let listeners = []

export function onAuthChange(callback) {
  listeners.push(callback)
  return () => {
    listeners = listeners.filter((l) => l !== callback)
  }
}

function notify() {
  listeners.forEach((l) => l(authState))
}

export function getAuthState() {
  return { ...authState }
}

export async function initAuth() {
  if (!isSupabaseConfigured) {
    authState = { user: null, session: null, isReviewer: false, loading: false }
    notify()
    return
  }

  // Obtén la sesión actual (si existe).
  const { data: { session } } = await supabase.auth.getSession()
  updateState(session?.user || null, session)

  // Escucha cambios de auth.
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(async (event, session) => {
    updateState(session?.user || null, session)
  })

  return () => subscription?.unsubscribe()
}

function updateState(user, session) {
  // El rol vive en app_metadata: sólo un admin (service_role) puede asignarlo,
  // el usuario NO puede cambiárselo. Es lo mismo que verifica la política RLS.
  const isReviewer = user?.app_metadata?.role === 'reviewer'
  authState = { user, session, isReviewer, loading: false }
  notify()
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error
  return data.user
}

export async function signOut() {
  await supabase.auth.signOut()
}

export { supabase }
