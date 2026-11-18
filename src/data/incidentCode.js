// Código público de cada reporte, p. ej. LIM-MIR-000123:
//   LIM    = departamento (código ISO 3166-2:PE)
//   MIR    = distrito: 2 a 4 letras, ÚNICAS dentro del departamento
//   000123 = número correlativo ÚNICO en todo el país
//
// Las abreviaturas de los 1892 distritos salen de una tabla GENERADA por
// scripts/gen-district-codes.mjs (district-codes.json), la misma que usa la BD
// (tabla public.district_codes). En Supabase el código lo arma la BD al
// insertar; esto se usa en el modo demo (localStore) y para explicar el código.

import DISTRICT_CODES from './district-codes.json'
import { plain, departmentCode, ruleAbbr } from './codeRule.js'
import { titleCase } from './peru.js'

export { departmentCode }

// Igual que incident_district_code() en el SQL: 1) departamento + provincia +
// distrito; 2) sin provincia: departamento + distrito si el nombre es único
// en ese departamento; 3) si no está en la tabla: la regla base.
export function districtCode(departamento, provincia, district) {
  const dep = DISTRICT_CODES[plain(departamento)]
  const dist = plain(district)
  if (dep) {
    const exact = dep[plain(provincia)]?.[dist]
    if (exact) return exact
    const matches = Object.values(dep)
      .map((prov) => prov[dist])
      .filter(Boolean)
    if (matches.length === 1) return matches[0]
  }
  return ruleAbbr(district)
}

export function makeIncidentCode(departamento, provincia, district, number) {
  return `${departmentCode(departamento)}-${districtCode(departamento, provincia, district)}-${String(number).padStart(6, '0')}`
}

// Partes del código ya explicadas, para la ayuda "?" de la UI.
export function explainCode(incident) {
  const [dep, dist, num] = (incident.code || '').split('-')
  return {
    dep,
    depName: incident.departamento ? titleCase(incident.departamento) : 'departamento no indicado',
    dist,
    distName:
      incident.district && incident.district !== 'Otro'
        ? titleCase(incident.district)
        : 'distrito no indicado',
    num,
  }
}
