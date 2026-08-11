// Canal oficial de WhatsApp de la autoridad para reportar semáforos
// malogrados (el mismo "#AlertaSemáforo" que ellos difunden por su cuenta).
// La app no puede enviar el mensaje de forma automática — WhatsApp no lo
// permite sin su API de Empresas — así que esto arma un link de "click to
// chat" con el mensaje prellenado; la persona solo tiene que tocar enviar
// desde su propio WhatsApp.
import { FAULT_TYPES } from '../constants.js'
import { titleCase } from './peru.js'

export const AUTHORITY_WHATSAPP_NUMBER = '51982157840'

function faultLabel(key) {
  return FAULT_TYPES.find((f) => f.key === key)?.label || 'Otro'
}

export function buildWhatsappReportUrl(incident) {
  const lugar = [incident.district, incident.provincia, incident.departamento]
    .filter((x) => x && x !== 'Otro')
    .map(titleCase)
    .join(', ')
  const gmaps = `https://www.google.com/maps/search/?api=1&query=${incident.lat},${incident.lng}`
  const lines = [
    'Hola, quiero reportar un semáforo malogrado:',
    incident.title && `📍 ${incident.title}`,
    lugar && `🏙️ ${lugar}`,
    `🗺️ Ubicación: ${gmaps}`,
    `⚠️ Falla: ${faultLabel(incident.faultType)}`,
    incident.description && `📝 ${incident.description}`,
  ].filter(Boolean)
  return `https://wa.me/${AUTHORITY_WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`
}
