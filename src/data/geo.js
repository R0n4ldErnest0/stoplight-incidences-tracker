// Geocodificación inversa: de coordenadas GPS -> departamento/provincia/distrito.
// Usa Nominatim (OpenStreetMap), gratuito. Requiere atribución y respeta un
// límite bajo de peticiones (lo llamamos una vez al fijar la ubicación).

import { matchUbigeoFromValues } from './peru.js'

// Devuelve {} | {departamento} | {departamento, provincia} | {..., distrito}.
export async function reverseGeocodeUbigeo(lat, lng) {
  const url =
    'https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1' +
    `&accept-language=es&zoom=12&lat=${lat}&lon=${lng}`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error('reverse geocode ' + res.status)
  const data = await res.json()
  const addr = data.address || {}
  // No sabemos qué campo de Nominatim mapea a cada nivel en Perú, así que
  // pasamos todos los valores del address y dejamos que el matcher resuelva la
  // jerarquía contra el dataset oficial.
  return matchUbigeoFromValues(Object.values(addr))
}
