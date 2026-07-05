// División política del Perú (UBIGEO): Departamento → Provincia → Distrito.
// Fuente: dataset UBIGEO (INEI), estructura anidada compacta en peru-ubigeo.json.
// Se usa para los desplegables en cascada y para emparejar la geolocalización.

import UBIGEO from './peru-ubigeo.json'

// Normaliza para comparar: sin tildes, mayúsculas, sin espacios extra.
export function normalize(s) {
  return (s || '')
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .trim()
}

const SMALL = new Set(['DE', 'DEL', 'LA', 'LAS', 'LOS', 'Y', 'EL', 'EN'])

// Muestra los nombres (que vienen en MAYÚSCULAS) de forma legible.
export function titleCase(s) {
  return (s || '')
    .toLowerCase()
    .split(/\s+/)
    .map((w, i) =>
      i > 0 && SMALL.has(w.toUpperCase()) ? w : w.charAt(0).toUpperCase() + w.slice(1)
    )
    .join(' ')
}

export function departamentos() {
  return Object.keys(UBIGEO).sort((a, b) => a.localeCompare(b, 'es'))
}

export function provincias(dep) {
  return dep && UBIGEO[dep]
    ? Object.keys(UBIGEO[dep]).sort((a, b) => a.localeCompare(b, 'es'))
    : []
}

export function distritos(dep, prov) {
  return (dep && prov && UBIGEO[dep] && UBIGEO[dep][prov]) || []
}

// Empareja una lista de nombres (los del address de la geolocalización) con los
// nombres canónicos del dataset, respetando la jerarquía. Devuelve lo que logre
// resolver: {} | {departamento} | {departamento, provincia} | {..., distrito}.
export function matchUbigeoFromValues(values) {
  const norm = values.map(normalize).filter(Boolean)
  const inList = (name) => norm.includes(normalize(name))

  const depKey =
    departamentos().find((d) => inList(d)) ||
    departamentos().find((d) => norm.some((v) => normalize(d).includes(v) && v.length >= 4))
  if (!depKey) return {}

  const result = { departamento: depKey }
  const provKey =
    provincias(depKey).find((p) => inList(p)) ||
    provincias(depKey).find((p) => norm.some((v) => normalize(p).includes(v) && v.length >= 4))
  if (!provKey) return result

  result.provincia = provKey
  const distName =
    distritos(depKey, provKey).find((x) => inList(x)) ||
    distritos(depKey, provKey).find((x) =>
      norm.some((v) => normalize(x).includes(v) && v.length >= 4)
    )
  if (distName) result.distrito = distName
  return result
}
