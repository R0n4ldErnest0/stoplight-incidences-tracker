import { FiX } from 'react-icons/fi'
import { useBackClose } from '../useBackClose.js'
import AboutView from './AboutView.jsx'

// "Acerca de" como modal; el botón "atrás" del teléfono también lo cierra.
export default function AboutModal({ onClose }) {
  useBackClose(onClose)
  return (
    <div className="overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <h2>Acerca de</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar"><FiX /></button>
        </div>
        <div className="drawer-body">
          <AboutView />
        </div>
      </div>
    </div>
  )
}
