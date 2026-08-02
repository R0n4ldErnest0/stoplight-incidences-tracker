import { FiInfo, FiPlus, FiCamera, FiAlertTriangle, FiActivity } from 'react-icons/fi'
import { useBackClose } from '../useBackClose.js'

// Se muestra una sola vez, la primera vez que alguien abre la app en este
// navegador. A diferencia del resumen conceptual de "Acerca de", aquí los
// pasos son las acciones reales y en orden que se hacen en la app.
export const ONBOARDING_SEEN_KEY = 'semaforo-alerta:onboarding-seen:v1'

const ONBOARDING_STEPS = [
  {
    Icon: FiPlus,
    title: 'Toca "+ Reportar semáforo"',
    text: 'Es el botón grande y azul, siempre visible en la pantalla.',
  },
  {
    Icon: FiCamera,
    title: 'Sube una foto y marca el punto',
    text: 'Usa tu GPS o toca el mapa para ubicar el semáforo exacto, y confirma el distrito.',
  },
  {
    Icon: FiAlertTriangle,
    title: 'Cuenta qué pasa',
    text: 'Elige el tipo de falla (apagado, intermitente...) y describe el problema.',
  },
  {
    Icon: FiActivity,
    title: 'Publica y sigue el estado',
    text: 'Tu reporte queda público en el mapa. Verás en todo momento si la autoridad lo revisó, si está en reparación o ya se resolvió.',
  },
]

export default function OnboardingModal({ onClose, onMoreInfo }) {
  useBackClose(onClose)
  return (
    <div className="overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-body onboarding">
          <h1 className="about-hero" style={{ fontSize: 22 }}>¿Has visto un semáforo malogrado? 🚦</h1>
          <p className="about-lead" style={{ fontSize: 14 }}>
            Repórtalo en 4 simples pasos:
          </p>
          <ol className="onboarding-steps">
            {ONBOARDING_STEPS.map((s, i) => (
              <li key={s.title} className="onboarding-step">
                <span className="onboarding-num">{i + 1}</span>
                <div>
                  <div className="about-step-title">{s.title}</div>
                  <div className="about-step-text">{s.text}</div>
                </div>
              </li>
            ))}
          </ol>
          <button className="btn btn-primary btn-block btn-lg" onClick={onClose}>
            Entendido, empezar
          </button>
          <button className="btn btn-block onboarding-more" onClick={onMoreInfo}>
            <FiInfo /> Más información sobre el proyecto
          </button>
        </div>
      </div>
    </div>
  )
}
