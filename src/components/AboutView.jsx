// Sección "Acerca de": qué es el proyecto, por qué existe, cómo funciona,
// quién lo hizo y hacia dónde va.
import { FiCamera, FiMap, FiActivity, FiBarChart2, FiMail, FiGithub, FiLinkedin, FiGlobe } from 'react-icons/fi'

// Datos del creador. Deja en '' cualquier enlace que no quieras mostrar.
const CREATOR = {
  name: 'Ronald Ernesto',
  role: 'Creador y desarrollador',
  bio:
    'Construí SemáforoAlerta para que reportar un semáforo malogrado en Lima ' +
    'deje de ser un agujero negro y se convierta en algo público y rastreable.',
  github: 'https://github.com/R0n4ldErnest0',
  linkedin: 'https://www.linkedin.com/in/ronald-ernesto-soto-nicoll/',
  // Vacíos a propósito: no publicamos contacto personal sin tu confirmación.
  email: '', // p.ej. 'tucorreo@example.com'
  site: '', // p.ej. 'https://tusitio.com'
}

const STEPS = [
  {
    Icon: FiCamera,
    title: 'La ciudadanía reporta',
    text: 'Foto + ubicación (GPS o tocando el mapa) + descripción de la falla. Toma segundos.',
  },
  {
    Icon: FiMap,
    title: 'Queda público',
    text: 'El reporte aparece en un mapa abierto para todos, con su historial visible.',
  },
  {
    Icon: FiActivity,
    title: 'La autoridad actualiza',
    text: 'Revisado → En reparación → Resuelto. Cada cambio queda registrado y a la vista.',
  },
  {
    Icon: FiBarChart2,
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
    creator.email && { href: `mailto:${creator.email}`, label: 'Correo', Icon: FiMail },
    creator.github && { href: creator.github, label: 'GitHub', Icon: FiGithub },
    creator.linkedin && { href: creator.linkedin, label: 'LinkedIn', Icon: FiLinkedin },
    creator.site && { href: creator.site, label: 'Sitio', Icon: FiGlobe },
  ].filter(Boolean)
  if (!links.length) return null
  return (
    <div className="about-links">
      {links.map((l) => (
        <a key={l.href} className="chip" href={l.href} target="_blank" rel="noreferrer">
          <l.Icon /> {l.label}
        </a>
      ))}
    </div>
  )
}

// Se muestra dentro de un modal (drawer), no como vista a pantalla completa.
export default function AboutView() {
  return (
      <div className="about">
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
              <div className="about-step-icon"><s.Icon /></div>
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
  )
}
