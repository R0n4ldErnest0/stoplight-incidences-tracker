// Incidencias de ejemplo para el modo demo (localStorage). NO se usan con
// Supabase: el sitio real muestra solo reportes reales.
//
// Se generan de forma determinista (misma semilla => mismos datos en cada
// carga y en los tests), repartidas en los últimos 12 meses con fechas
// relativas a hoy, para que los filtros de fecha y los gráficos del panel de
// transparencia siempre tengan algo que mostrar. Cada reporte recorre el ciclo
// Reportado → Revisado → En reparación → Resuelto con demoras realistas, así
// que los más antiguos tienden a estar resueltos y los recientes pendientes.

// Cruces conocidos de Lima (coordenadas aproximadas).
const CROSSINGS = [
  { title: 'Av. Javier Prado con Av. Arequipa', district: 'Lince', lat: -12.0931, lng: -77.0364 },
  { title: 'Óvalo Gutiérrez', district: 'Miraflores', lat: -12.1145, lng: -77.0353 },
  { title: 'Av. Arequipa con Av. Angamos', district: 'Miraflores', lat: -12.1133, lng: -77.0318 },
  { title: 'Av. Larco con Av. Benavides', district: 'Miraflores', lat: -12.1262, lng: -77.0298 },
  { title: 'Av. La Marina con Av. Universitaria', district: 'San Miguel', lat: -12.0772, lng: -77.0817 },
  { title: 'Av. La Marina con Av. Sucre', district: 'San Miguel', lat: -12.0796, lng: -77.0672 },
  { title: 'Av. Brasil con Av. Pershing', district: 'Magdalena', lat: -12.0905, lng: -77.0593 },
  { title: 'Av. Salaverry con Av. Javier Prado', district: 'San Isidro', lat: -12.0901, lng: -77.0489 },
  { title: 'Av. Camino Real con Av. Javier Prado', district: 'San Isidro', lat: -12.0920, lng: -77.0395 },
  { title: 'Av. Aviación con Av. Canadá', district: 'San Borja', lat: -12.0876, lng: -77.0011 },
  { title: 'Av. Aviación con Av. San Luis', district: 'San Borja', lat: -12.0996, lng: -77.0019 },
  { title: 'Av. Angamos con Av. Tomás Marsano', district: 'Surquillo', lat: -12.1137, lng: -77.0122 },
  { title: 'Av. Primavera con Av. Velasco Astete', district: 'Santiago de Surco', lat: -12.1110, lng: -76.9890 },
  { title: 'Av. Benavides con Av. Caminos del Inca', district: 'Santiago de Surco', lat: -12.1288, lng: -76.9935 },
  { title: 'Av. Abancay con Av. Nicolás de Piérola', district: 'Cercado de Lima', lat: -12.0500, lng: -77.0320 },
  { title: 'Av. Grau con Av. Abancay', district: 'Cercado de Lima', lat: -12.0570, lng: -77.0285 },
  { title: 'Av. Colonial con Av. Universitaria', district: 'Cercado de Lima', lat: -12.0502, lng: -77.0838 },
  { title: 'Av. Arenales con Av. Canevaro', district: 'Lince', lat: -12.0834, lng: -77.0352 },
  { title: 'Av. Sucre con Av. Bolívar', district: 'Pueblo Libre', lat: -12.0745, lng: -77.0645 },
  { title: 'Av. Próceres con Av. Las Flores', district: 'San Juan de Lurigancho', lat: -12.0050, lng: -76.9990 },
  { title: 'Av. Próceres con Av. Canto Grande', district: 'San Juan de Lurigancho', lat: -11.9850, lng: -77.0050 },
  { title: 'Av. Túpac Amaru con Av. Naranjal', district: 'Independencia', lat: -11.9835, lng: -77.0560 },
  { title: 'Av. Alfredo Mendiola con Av. Tomás Valle', district: 'Los Olivos', lat: -12.0005, lng: -77.0660 },
  { title: 'Av. Javier Prado Este con Av. Nicolás Ayllón', district: 'Ate', lat: -12.0585, lng: -76.9505 },
  { title: 'Av. Defensores del Morro con Av. Huaylas', district: 'Chorrillos', lat: -12.1720, lng: -77.0150 },
  { title: 'Av. Los Héroes con Av. San Juan', district: 'San Juan de Miraflores', lat: -12.1550, lng: -76.9720 },
]

const FAULTS = [
  // [tipo, peso, descripciones posibles]
  ['apagado', 5, [
    'Semáforo apagado por completo, cruce muy peligroso en hora punta.',
    'Apagado en las noches, peligroso para quienes salen tarde.',
    'Sin luz desde el último apagón, nadie lo ha revisado.',
  ]],
  ['intermitente', 3, [
    'Solo parpadea en ámbar todo el día.',
    'Queda en intermitente en la mañana y los autos no respetan el cruce.',
  ]],
  ['pegado', 2, [
    'El semáforo peatonal queda pegado en rojo, la gente cruza con los autos en movimiento.',
    'Se queda en verde para los autos, los peatones no pueden cruzar.',
  ]],
  ['dañado', 2, [
    'Poste chocado, quedó inclinado y sin funcionar.',
    'Una de las luces está rota y colgando de los cables.',
  ]],
  ['desfasado', 2, [
    'Tiempos descoordinados, se forman colas enormes.',
    'El verde dura muy poco, apenas pasan dos autos.',
  ]],
  ['otro', 1, ['El semáforo emite chispas cuando llueve.']],
]

// Generador pseudoaleatorio con semilla (mulberry32): mismos datos siempre.
function rng(seed) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const DAY = 86400000

function generateSeed() {
  const rand = rng(20261112)
  const pick = (arr) => arr[Math.floor(rand() * arr.length)]
  const between = (min, max) => min + rand() * (max - min)
  const totalWeight = FAULTS.reduce((s, f) => s + f[1], 0)
  const pickFault = () => {
    let r = rand() * totalWeight
    for (const f of FAULTS) if ((r -= f[1]) <= 0) return f
    return FAULTS[0]
  }

  const now = Date.now()
  const incidents = []
  // Unos 80 reportes en 365 días, con más reportes en los meses recientes
  // (la app se va conociendo): la edad se sesga hacia valores bajos.
  const COUNT = 80
  for (let n = 0; n < COUNT; n++) {
    const ageDays = Math.pow(rand(), 1.4) * 365
    // Hora del día entre 6 a.m. y 11 p.m. (hora local aproximada).
    const created = now - ageDays * DAY - between(0, 17) * 3600000
    const c = pick(CROSSINGS)
    const [faultType, , descriptions] = pickFault()
    const history = [{ status: 'reported', at: new Date(created).toISOString(), note: 'Reporte ciudadano' }]

    // Ciclo de vida: cada paso ocurre (o no) con una demora realista; si la
    // fecha del paso cae en el futuro, el reporte se queda en el estado actual.
    let t = created
    let status = 'reported'
    const step = (next, prob, minD, maxD, note) => {
      if (status === 'resolved' || status === 'duplicate') return
      if (rand() > prob) return
      const at = t + between(minD, maxD) * DAY
      if (at > now) return
      t = at
      status = next
      history.push({ status: next, at: new Date(at).toISOString(), note })
    }
    if (rand() < 0.06) {
      step('duplicate', 1, 0.5, 3, 'Ya existe un reporte para este semáforo')
    } else {
      step('acknowledged', 0.85, 0.5, 14, 'Confirmado por la municipalidad')
      if (status === 'acknowledged') step('in_progress', 0.8, 1, 20, 'Cuadrilla asignada')
      if (status === 'in_progress') step('resolved', 0.85, 1, 30, 'Semáforo reparado')
    }

    incidents.push({
      id: `seed-${n + 1}`,
      title: c.title,
      description: pick(descriptions),
      faultType,
      departamento: 'LIMA',
      provincia: 'LIMA',
      district: c.district,
      // Pequeña variación para que reportes del mismo cruce no se tapen.
      lat: +(c.lat + between(-0.0012, 0.0012)).toFixed(5),
      lng: +(c.lng + between(-0.0012, 0.0012)).toFixed(5),
      status,
      photos: [],
      photo: null,
      flags: 0,
      hidden: false,
      removedAt: null,
      removedReason: '',
      createdAt: new Date(created).toISOString(),
      history,
    })
  }

  // Algunos ejemplos de moderación (nunca entre los más recientes, para no
  // interferir con los tests que marcan el primer reporte de la lista).
  const byAge = [...incidents].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
  byAge[10].flags = 1
  byAge[25].flags = 1
  byAge[40].flags = 2
  byAge[40].hidden = true

  return incidents
}

export const SEED_INCIDENTS = generateSeed()
