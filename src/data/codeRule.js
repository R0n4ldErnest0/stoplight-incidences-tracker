// Regla base de las abreviaturas del código de reporte (sin dependencias, para
// poder usarla también desde scripts/gen-district-codes.mjs en Node).
//
// ⚠️ La misma regla existe en SQL (incident_plain / incident_dept_code /
// incident_district_abbr en supabase/schema.sql). Solo se usa como RESPALDO
// para distritos que no están en la tabla generada (p. ej. "Otro").

// Departamentos (sin tildes) -> código ISO 3166-2:PE.
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

// Palabras que no cuentan para la abreviatura ("San Juan DE Lurigancho" -> SJL).
const SMALL_WORDS = new Set(['DE', 'DEL', 'LA', 'LAS', 'LOS', 'Y', 'EL', 'EN'])

// Mayúsculas y sin tildes; Ñ -> N (igual que incident_plain() en el SQL).
export function plain(s) {
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

// Sin departamento conocido (reportes antiguos) se usa PER (Perú).
export function departmentCode(departamento) {
  return DEPARTMENT_CODES[plain(departamento)] || 'PER'
}

// Palabras que cuentan, solo letras A-Z.
export function significantWords(name) {
  return plain(name)
    .split(/[\s-]+/)
    .map((w) => w.replace(/[^A-Z]/g, ''))
    .filter((w) => w && !SMALL_WORDS.has(w))
}

// Regla base:
//   1 palabra  -> sus 3 primeras letras        (Miraflores -> MIR)
//   2 palabras -> 1 letra + 2 letras           (San Luis -> SLU)
//   3 o más    -> iniciales de las 3 primeras  (San Juan de Lurigancho -> SJL)
// Sin distrito conocido -> OTR.
export function ruleAbbr(district) {
  const words = significantWords(district)
  if (words.length === 0) return 'OTR'
  if (words.length === 1) return words[0].slice(0, 3)
  if (words.length === 2) return words[0][0] + words[1].slice(0, 2)
  return words[0][0] + words[1][0] + words[2][0]
}
