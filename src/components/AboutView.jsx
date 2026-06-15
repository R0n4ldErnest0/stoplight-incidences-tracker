// Sección "Acerca de": qué es el proyecto, por qué existe, cómo funciona,
// quién lo hizo y hacia dónde va.
//
// 👉 EDITA este bloque con tus datos reales. Son los únicos placeholders.
const CREATOR = {
  name: 'Ronald Ernesto', // TODO: confirma cómo quieres que aparezca tu nombre
  role: 'Creador y desarrollador',
  bio:
    'Construí SemáforoAlerta para que reportar un semáforo malogrado en Lima ' +
    'deje de ser un agujero negro y se convierta en algo público y rastreable.',
  // Deja en '' los que no quieras mostrar.
  email: '', // p.ej. 'tucorreo@example.com'
  github: '', // p.ej. 'https://github.com/R0n4ldErnest0'
  linkedin: '', // p.ej. 'https://linkedin.com/in/...'
  site: '', // p.ej. 'https://tusitio.com'
}

const STEPS = [
  {
    icon: '📸',
    title: 'La ciudadanía reporta',
    text: 'Foto + ubicación (GPS o tocando el mapa) + descripción de la falla. Toma segundos.',
  },
  {
    icon: '🗺️',
    title: 'Queda público',
    text: 'El reporte aparece en un mapa abierto para todos, con su historial visible.',
  },
  {
    icon: '🚦',
    title: 'La autoridad actualiza',
    text: 'Revisado → En reparación → Resuelto. Cada cambio queda registrado y a la vista.',
  },
  {
    icon: '📊',
    title: 'Rendición de cuentas',
    text: 'Un panel de transparencia muestra tiempos de respuesta y reparación por distrito.',
  },
]

const ROADMAP = [
  'Detección de duplicados por cercanía para acumular reportes del mismo semáforo.',
  'Registro de semáforos por intersección para medir reincidencia.',
  'Canal directo con autoridades municipales (notificación y seguimiento).',
  'Notificaciones cuando cambia el estado de un reporte que sigues.',
  'Compatibilidad con el estándar Open311 para interoperar con sistemas oficiales.',
  'Service worker para uso offline real (PWA instalable).',
]

function CreatorLinks({ creator }) {
  const links = [
    creator.email && { href: `mailto:${creator.email}`, label: '✉️ Correo' },
    creator.github && { href: creator.github, label: '💻 GitHub' },
    creator.linkedin && { href: creator.linkedin, label: '🔗 LinkedIn' },
    creator.site && { href: creator.site, label: '🌐 Sitio' },
  ].filter(Boolean)
  if (!links.length) return null
  return (
    <div className="about-links">
      {links.map((l) => (
        <a key={l.href} className="chip" href={l.href} target="_blank" rel="noreferrer">
          {l.label}
        </a>
      ))}
    </div>
  )
}

export default function AboutView() {
  return (
    <div className="dash-wrap">
      <div className="dash about">
        <h1 className="about-hero">SemáforoAlerta 🚦</h1>
        <p className="about-lead">
          Mapa público y transparente de semáforos malogrados en Lima, Perú. La
          transparencia es el producto: un backlog público y accionable que
          permite exigir reparaciones.
        </p>

        <h2 className="dash-section">Por qué</h2>
        <p className="about-text">
          Hoy reportar un semáforo en Lima se hace por WhatsApp o apps donde el
          reporte es un “agujero negro”: no sabes si alguien lo vio ni cuándo se
          reparará. Este proyecto agrega lo que falta: <b>visibilidad pública,
          historial y rendición de cuentas</b>.
        </p>

        <h2 className="dash-section">Cómo funciona</h2>
        <div className="about-steps">
          {STEPS.map((s) => (
            <div key={s.title} className="about-step">
              <div className="about-step-icon">{s.icon}</div>
              <div>
                <div className="about-step-title">{s.title}</div>
                <div className="about-step-text">{s.text}</div>
              </div>
            </div>
          ))}
        </div>

        <h2 className="dash-section">Quién está detrás</h2>
        <div className="about-creator">
          <div className="about-avatar">{CREATOR.name.charAt(0)}</div>
          <div>
            <div className="about-creator-name">{CREATOR.name}</div>
            <div className="about-creator-role">{CREATOR.role}</div>
            <p className="about-text" style={{ margin: '6px 0 0' }}>{CREATOR.bio}</p>
            <CreatorLinks creator={CREATOR} />
          </div>
        </div>

        <h2 className="dash-section">Hacia dónde vamos</h2>
        <ul className="about-roadmap">
          {ROADMAP.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <p className="about-foot">
          Proyecto de código abierto · hecho para Lima, replicable en cualquier ciudad.
        </p>
      </div>
    </div>
  )
}
