// Código público de cada reporte, p. ej. LIM-MIR-000123:
//   LIM    = departamento (código ISO 3166-2:PE)
//   MIR    = distrito (abreviatura automática del nombre)
//   000123 = número correlativo ÚNICO en todo el país
//
// Lo que hace único al código es el número: las letras solo dicen dónde está
// (dos distritos con la misma abreviatura no generan códigos repetidos).
//
// ⚠️ Esta lógica está DUPLICADA en SQL (funciones incident_dept_code /
// incident_district_abbr en supabase/schema.sql): en Supabase el código lo
// arma la BD al insertar; esta versión se usa en el modo demo (localStore) y
// para explicar el código en la UI. Si cambias una, cambia la otra.

import { titleCase } from './peru.js'

// Departamentos (claves del dataset UBIGEO, sin tildes) -> código ISO 3166-2:PE.
export const DEPARTMENT_CODES = {
  AMAZONAS: 'AMA',
  ANCASH: 'ANC',
  APURIMAC: 'APU',
  AREQUIPA: 'ARE',
  AYACUCHO: 'AYA',
  CAJAMARCA: 'CAJ',
  CALLAO: 'CAL',
  CUSCO: 'CUS',
  HUANCAVELICA: 'HUV',
  HUANUCO: 'HUC',
  ICA: 'ICA',
  JUNIN: 'JUN',
  'LA LIBERTAD': 'LAL',
  LAMBAYEQUE: 'LAM',
  LIMA: 'LIM',
  LORETO: 'LOR',
  'MADRE DE DIOS': 'MDD',
  MOQUEGUA: 'MOQ',
  PASCO: 'PAS',
  PIURA: 'PIU',
  PUNO: 'PUN',
  'SAN MARTIN': 'SAM',
  TACNA: 'TAC',
  TUMBES: 'TUM',
  UCAYALI: 'UCA',
}

// Sin departamento conocido (reportes antiguos) se usa PER (Perú).
const NO_DEPT = 'PER'
// Sin distrito conocido.
const NO_DISTRICT = 'OTR'

// Palabras que no cuentan para la abreviatura ("San Juan DE Lurigancho" -> SJL).
const SMALL_WORDS = new Set(['DE', 'DEL', 'LA', 'LAS', 'LOS', 'Y', 'EL', 'EN'])

// Mayúsculas y sin tildes; Ñ -> N (igual que translate() en el SQL).
function plain(s) {
  return (s || '')
    .toString()
    .toUpperCase()
    .replace(/[ÁÀ]/g, 'A')
    .replace(/[ÉÈ]/g, 'E')
    .replace(/[ÍÌ]/g, 'I')
    .replace(/[ÓÒ]/g, 'O')
    .replace(/[ÚÙÜ]/g, 'U')
    .replace(/Ñ/g, 'N')
    .trim()
}

export function departmentCode(departamento) {
  return DEPARTMENT_CODES[plain(departamento)] || NO_DEPT
}

// Abreviatura del distrito:
//   1 palabra  -> sus 3 primeras letras        (Miraflores -> MIR)
//   2 palabras -> 1 letra + 2 letras           (San Isidro -> SIS)
//   3 o más    -> iniciales de las 3 primeras  (San Juan de Lurigancho -> SJL)
export function districtAbbr(district) {
  const words = plain(district)
    .split(/[\s-]+/)
    .map((w) => w.replace(/[^A-Z]/g, ''))
    .filter((w) => w && !SMALL_WORDS.has(w))
  if (words.length === 0) return NO_DISTRICT
  if (words.length === 1) return words[0].slice(0, 3)
  if (words.length === 2) return words[0][0] + words[1].slice(0, 2)
  return words[0][0] + words[1][0] + words[2][0]
}

export function makeIncidentCode(departamento, district, number) {
  return `${departmentCode(departamento)}-${districtAbbr(district)}-${String(number).padStart(6, '0')}`
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
