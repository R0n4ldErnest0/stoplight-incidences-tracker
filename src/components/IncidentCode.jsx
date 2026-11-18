import { useId, useState } from 'react'
import { FiHelpCircle, FiHash } from 'react-icons/fi'
import { explainCode } from '../data/incidentCode.js'

// Código público del reporte con su "?" que explica qué significa cada parte.
// (En las tarjetas de la lista se muestra solo el texto: la tarjeta entera es
// un botón y no puede llevar otro botón adentro.)
export default function IncidentCode({ incident, large }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  if (!incident.code) return null
  const e = explainCode(incident)
  return (
    <div className={large ? 'incident-code large' : 'incident-code'}>
      <div className="incident-code-row">
        <span className="code-pill"><FiHash /> {incident.code}</span>
        <button
          type="button"
          className={open ? 'help-btn open' : 'help-btn'}
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={id}
          aria-label="¿Qué significa este código?"
          title="¿Qué significa este código?"
        >
          <FiHelpCircle />
        </button>
      </div>
      {open && (
        <div id={id} className="how-box" role="note">
          <p><b>{e.dep}</b> = {e.depName} (departamento)</p>
          <p><b>{e.dist}</b> = {e.distName} (distrito)</p>
          <p><b>{e.num}</b> = número del reporte, único en todo el país</p>
          <p>Con este código puedes buscar el reporte en la pestaña Lista.</p>
        </div>
      )}
    </div>
  )
}
