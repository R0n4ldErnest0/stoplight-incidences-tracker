// Centro aproximado de Lima Metropolitana
export const LIMA_CENTER = [-12.0464, -77.0428]
export const DEFAULT_ZOOM = 12

// Flujo de estados de una incidencia.
// El orden importa: representa el ciclo de vida de un reporte.
export const STATUSES = {
  reported: {
    key: 'reported',
    label: 'Reportado',
    color: '#ef4444', // rojo
    description: 'Reportado por la ciudadanía, sin revisar todavía.',
  },
  acknowledged: {
    key: 'acknowledged',
    label: 'Revisado',
    color: '#f59e0b', // ámbar
    description: 'La autoridad confirmó haberlo visto.',
  },
  in_progress: {
    key: 'in_progress',
    label: 'En reparación',
    color: '#3b82f6', // azul
    description: 'Hay trabajo en curso para repararlo.',
  },
  resolved: {
    key: 'resolved',
    label: 'Resuelto',
    color: '#22c55e', // verde
    description: 'El semáforo fue reparado.',
  },
  duplicate: {
    key: 'duplicate',
    label: 'Duplicado',
    color: '#94a3b8', // gris
    description: 'Ya existe un reporte para este semáforo.',
  },
}

export const STATUS_ORDER = ['reported', 'acknowledged', 'in_progress', 'resolved']

// Tipos de falla más comunes en semáforos.
export const FAULT_TYPES = [
  { key: 'apagado', label: 'Apagado / sin luz' },
  { key: 'intermitente', label: 'Solo intermitente' },
  { key: 'pegado', label: 'Pegado en un color' },
  { key: 'dañado', label: 'Estructura dañada / chocado' },
  { key: 'desfasado', label: 'Tiempos mal sincronizados' },
  { key: 'otro', label: 'Otro' },
]

// Rangos de fecha para filtrar incidencias por antigüedad del reporte.
export const DATE_RANGES = [
  { key: 'all', label: 'Todo el tiempo', days: null },
  { key: '7d', label: 'Últimos 7 días', days: 7 },
  { key: '30d', label: 'Últimos 30 días', days: 30 },
  { key: '90d', label: 'Últimos 90 días', days: 90 },
]

// Distritos de Lima (lista corta para el demo).
export const DISTRICTS = [
  'Cercado de Lima',
  'Miraflores',
  'San Isidro',
  'Surco',
  'La Molina',
  'San Borja',
  'Barranco',
  'Surquillo',
  'San Miguel',
  'Magdalena',
  'Lince',
  'Jesús María',
  'Pueblo Libre',
  'La Victoria',
  'Comas',
  'San Juan de Lurigancho',
  'Otro',
]
