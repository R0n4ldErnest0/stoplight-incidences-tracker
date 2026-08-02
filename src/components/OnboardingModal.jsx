import { FiInfo } from 'react-icons/fi'
import { useBackClose } from '../useBackClose.js'
import { STEPS } from './AboutView.jsx'

// Se muestra una sola vez, la primera vez que alguien abre la app en este
// navegador, para explicar de un vistazo cómo funciona antes de que reporte.
export const ONBOARDING_SEEN_KEY = 'semaforo-alerta:onboarding-seen:v1'

export default function OnboardingModal({ onClose, onMoreInfo }) {
  useBackClose(onClose)
  return (
    <div className="overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-body onboarding">
          <h1 className="about-hero" style={{ fontSize: 22 }}>¿Cómo funciona SemáforoAlerta? 🚦</h1>
          <p className="about-lead" style={{ fontSize: 14 }}>
            Cuatro pasos, así de simple:
          </p>
          <ol className="onboarding-steps">
            {STEPS.map((s, i) => (
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
