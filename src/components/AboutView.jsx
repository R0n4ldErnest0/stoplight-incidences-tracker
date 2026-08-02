// Sección "Acerca de": qué es el proyecto, por qué existe, cómo funciona,
// quién lo hizo y hacia dónde va.
import { FiCamera, FiMap, FiActivity, FiBarChart2, FiMail, FiGithub, FiLinkedin, FiGlobe } from 'react-icons/fi'

// Datos del creador. Deja en '' cualquier enlace que no quieras mostrar.
const CREATOR = {
  name: 'Ronald Ernesto',
  role: 'Ingeniero Mecánico (UNI) · Data Scientist en formación (MITx MicroMasters, BREIT)',
  bio:
    'Machine Learning, Python y automatización de procesos con IA. Construí ' +
    'SemáforoAlerta al ver semáforos malogrados en Lima que nadie reparaba y no ' +
    'tener dónde reportarlos: esta es mi propuesta de cómo podría ser un sistema ' +
    'mejor para eso.',
  github: 'https://github.com/R0n4ldErnest0',
  linkedin: 'https://www.linkedin.com/in/ronald-ernesto-soto-nicoll/',
  // Vacíos a propósito: no publicamos contacto personal sin tu confirmación.
  email: '', // p.ej. 'tucorreo@example.com'
  site: '', // p.ej. 'https://tusitio.com'
}

export const STEPS = [
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

// Envuelve una sección con título uniforme, para que "Acerca de" se lea como
// una sola familia visual en vez de bloques de texto sueltos. `plain` evita la
// tarjeta exterior cuando el contenido ya trae su propia tarjeta (p. ej. los
// pasos o la ficha del creador), para no anidar un borde dentro de otro.
function AboutSection({ title, plain, children }) {
  return (
    <section className="about-section">
      <h2 className="dash-section">{title}</h2>
      {plain ? children : <div className="about-card">{children}</div>}
    </section>
  )
}

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

        <AboutSection title="Qué es">
          <p className="about-text">
            Mapa público y transparente de semáforos malogrados en Lima, Perú. La
            transparencia es el producto: un backlog público y accionable que
            permite exigir reparaciones.
          </p>
        </AboutSection>

        <AboutSection title="Por qué">
          <p className="about-text">
            En Lima hay semáforos malogrados que llevan años así — los he visto
            yo mismo, cruce tras cruce, sin que nadie los repare. Cuando busqué
            cómo reportarlos, solo encontré publicaciones sueltas en Facebook
            con un WhatsApp inactivo, sin ninguna señal de que alguien los
            estuviera atendiendo. Quería que cualquier ciudadano pudiera
            reportar de forma fácil, rápida e intuitiva, y además tener{' '}
            <b>visibilidad en todo momento</b> de cómo va su reporte — y si
            es que alguien lo está atendiendo. Este proyecto es mi intento de
            cómo podría ser un sistema mejor; y es importante aclarar que, por
            ahora, es solo un prototipo.
          </p>
        </AboutSection>

        <AboutSection title="Cómo funciona" plain>
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
        </AboutSection>

        <AboutSection title="Quién está detrás" plain>
          <div className="about-creator">
            <div className="about-avatar">{CREATOR.name.charAt(0)}</div>
            <div>
              <div className="about-creator-name">{CREATOR.name}</div>
              <div className="about-creator-role">{CREATOR.role}</div>
              <p className="about-text" style={{ margin: '6px 0 0' }}>{CREATOR.bio}</p>
              <CreatorLinks creator={CREATOR} />
            </div>
          </div>
        </AboutSection>

        <AboutSection title="Esto es un prototipo">
          <p className="about-text">
            Es una primera versión hecha por una sola persona para validar la
            idea: hoy corre con datos de demostración y todavía faltan piezas
            para que sea un sistema realmente maduro. Así imagino que evolucione
            desde acá:
          </p>
          <ul className="about-roadmap">
            {ROADMAP.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </AboutSection>

        <p className="about-foot">
          Proyecto de código abierto · hecho para Lima, replicable en cualquier ciudad.
        </p>
      </div>
  )
}
