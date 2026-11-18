// Genera la tabla de abreviaturas ÚNICAS de distrito para el código de reporte
// (LIM-MIR-000123) a partir del dataset UBIGEO, y la escribe en DOS lugares
// para que la app y la BD nunca difieran:
//   - src/data/district-codes.json            (la usa la app / modo demo)
//   - el bloque "TABLA GENERADA" del SQL      (migración + schema.sql)
//
// Uso:  node scripts/gen-district-codes.mjs
//
// Reglas:
//   1. Primero las excepciones a mano (OVERRIDES): nombres que la gente ya usa.
//   2. Luego la regla base (src/data/codeRule.js): MIR, SJL, SLU...
//   3. Si dentro del MISMO departamento ya existe esa abreviatura, se agrega
//      una letra más del nombre (Lurín -> LURI) hasta que sea única; como
//      último recurso, la inicial de la provincia o un dígito.
//   La provincia principal del departamento (la que se llama igual, p. ej.
//   Lima/Lima) va primero, así sus distritos conservan las abreviaturas cortas.
//
// ⚠️ Una vez en producción, NO cambies abreviaturas existentes: los códigos ya
// emitidos no cambian (la BD los congela), pero los nuevos reportes del mismo
// distrito saldrían con otras letras. Agregar distritos nuevos sí es seguro.

import fs from 'node:fs'
import { plain, significantWords, ruleAbbr } from '../src/data/codeRule.js'

const ROOT = new URL('..', import.meta.url)
const read = (p) => fs.readFileSync(new URL(p, ROOT), 'utf8')
const write = (p, s) => fs.writeFileSync(new URL(p, ROOT), s)

// Departamento | Provincia | Distrito (como en el dataset) -> abreviatura.
const OVERRIDES = {
  'LIMA|LIMA|SAN BORJA': 'SB',
  'LIMA|LIMA|SAN ISIDRO': 'SI',
  'LIMA|LIMA|SANTA ANITA': 'SA',
  'LIMA|LIMA|VILLA EL SALVADOR': 'VES',
}

const SQL_FILES = [
  'supabase/migraciones/2026-11-18-codigo-de-reporte.sql',
  'supabase/schema.sql',
]
const START = '-- >>> TABLA GENERADA por scripts/gen-district-codes.mjs (no editar a mano)'
const END = '-- <<< FIN TABLA GENERADA'

// Candidatas en orden: la regla base, luego más letras de la última palabra
// usada, luego inicial de la provincia, luego dígitos.
function candidates(dist, prov) {
  const base = ruleAbbr(dist)
  const words = significantWords(dist)
  const out = [base]
  if (words.length) {
    // Palabra de la que salen las últimas letras de la base y cuántas usó.
    const [w, used] =
      words.length === 1 ? [words[0], 3] : words.length === 2 ? [words[1], 2] : [words[2], 1]
    for (let i = used; i < w.length; i++) out.push(base + w[i])
  }
  out.push(base + plain(prov).replace(/[^A-Z]/g, '')[0])
  for (let n = 2; n <= 9; n++) out.push(base + n)
  return out
}

const ubigeo = JSON.parse(read('src/data/peru-ubigeo.json'))
const table = {} // { DEP: { PROV: { DIST: abbr } } } con claves sin tildes
const rows = []

for (const dep of Object.keys(ubigeo)) {
  const used = new Map() // abbr -> distrito que la tiene (para el chequeo)
  for (const [key, abbr] of Object.entries(OVERRIDES)) {
    if (!key.startsWith(dep + '|')) continue
    if (used.has(abbr)) throw new Error(`Excepción repetida en ${dep}: ${abbr}`)
    used.set(abbr, key)
  }
  const provs = Object.keys(ubigeo[dep]).sort(
    (a, b) => (b === dep) - (a === dep) || a.localeCompare(b, 'es')
  )
  for (const prov of provs) {
    for (const dist of [...ubigeo[dep][prov]].sort((a, b) => a.localeCompare(b, 'es'))) {
      const key = `${dep}|${prov}|${dist}`
      let abbr = OVERRIDES[key]
      if (!abbr) {
        abbr = candidates(dist, prov).find((c) => !used.has(c))
        if (!abbr) throw new Error(`Sin abreviatura libre para ${key}`)
        used.set(abbr, key)
      }
      const [d, p, x] = [plain(dep), plain(prov), plain(dist)]
      ;((table[d] ||= {})[p] ||= {})[x] = abbr
      rows.push([d, p, x, abbr])
    }
  }
}

// Chequeos: ninguna abreviatura repetida dentro de un departamento, y todas
// las excepciones aplicadas a un distrito que existe.
const seen = new Set()
for (const [d, , , a] of rows) {
  const k = `${d}|${a}`
  if (seen.has(k)) throw new Error(`Abreviatura repetida: ${k}`)
  seen.add(k)
}
for (const key of Object.keys(OVERRIDES)) {
  const [d, p, x] = key.split('|').map(plain)
  if (table[d]?.[p]?.[x] !== OVERRIDES[key]) throw new Error(`Excepción sin distrito: ${key}`)
}

write('src/data/district-codes.json', JSON.stringify(table) + '\n')

const esc = (s) => s.replace(/'/g, "''")
const values = rows.map(([d, p, x, a]) => `  ('${esc(d)}','${esc(p)}','${esc(x)}','${a}')`).join(',\n')
const block = `${START}
-- ${rows.length} distritos. Abreviaturas únicas dentro de cada departamento.
insert into public.district_codes (departamento, provincia, distrito, abbr) values
${values}
on conflict (departamento, provincia, distrito) do update set abbr = excluded.abbr;
${END}`

for (const f of SQL_FILES) {
  const sql = read(f)
  const i = sql.indexOf(START)
  const j = sql.indexOf(END)
  if (i === -1 || j === -1) throw new Error(`Faltan los marcadores de la tabla en ${f}`)
  // Concatenación (no String.replace: sus patrones con $ romperían el SQL).
  write(f, sql.slice(0, i) + block + sql.slice(j + END.length))
}

const long = rows.filter((r) => r[3].length > 3).length
console.log(`${rows.length} distritos · ${long} con 4 letras · escrito JSON + ${SQL_FILES.length} SQL`)
