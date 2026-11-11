// Canales oficiales de WhatsApp de las autoridades para reportar semáforos
// malogrados (el "#AlertaSemáforo" de Lima es el único que tenemos por ahora
// — su jurisdicción es solo Lima). La app no puede enviar el mensaje de forma
// automática — WhatsApp no lo permite sin su API de Empresas — así que esto
// arma un link de "click to chat" con el mensaje prellenado; la persona solo
// tiene que tocar enviar desde su propio WhatsApp.
//
// Pensado para más de una autoridad: si se consigue el número de otra
// municipalidad/jurisdicción, agregarlo acá — IncidentDetail.jsx ya recorre
// esta lista y muestra un botón por cada una.
import { FAULT_TYPES } from '../constants.js'
import { titleCase } from './peru.js'
import { buildIncidentUrl } from '../shareLink.js'

export const AUTHORITIES = [
  {
    id: 'lima',
    label: 'Lima',
    description: 'Municipalidad Metropolitana de Lima — canal #AlertaSemáforo (solo jurisdicción Lima)',
    number: '51982157840',
  },
]

function faultLabel(key) {
  return FAULT_TYPES.find((f) => f.key === key)?.label || 'Otro'
}

// Solo URLs reales (Supabase Storage) sirven como link — en modo demo local
// `photos` son dataURLs base64 gigantes, inútiles (y rompen el link) como texto.
export function shareablePhotoUrls(incident) {
  const photos = incident.photos?.length ? incident.photos : incident.photo ? [incident.photo] : []
  return photos.filter((p) => /^https?:\/\//.test(p))
}

export function buildWhatsappReportUrl(incident, authority) {
  const lugar = [incident.district, incident.provincia, incident.departamento]
    .filter((x) => x && x !== 'Otro')
    .map(titleCase)
    .join(', ')
  const gmaps = `https://www.google.com/maps/search/?api=1&query=${incident.lat},${incident.lng}`
  const photoUrls = shareablePhotoUrls(incident)
  const lines = [
    'Hola, quiero reportar un semáforo malogrado:',
    incident.title && `📍 ${incident.title}`,
    lugar && `🏙️ ${lugar}`,
    `🗺️ Ubicación: ${gmaps}`,
    `⚠️ Falla: ${faultLabel(incident.faultType)}`,
    incident.description && `📝 ${incident.description}`,
    ...photoUrls.map((url, i) => `📷 Foto ${i + 1}: ${url}`),
    `🔗 Ver el reporte: ${buildIncidentUrl(incident.id)}`,
  ].filter(Boolean)
  return `https://wa.me/${authority.number}?text=${encodeURIComponent(lines.join('\n'))}`
}
