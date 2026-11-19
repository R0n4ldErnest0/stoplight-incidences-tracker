import { useId, useState } from 'react'
import { FiHelpCircle, FiCopy, FiCheck } from 'react-icons/fi'
import { explainCode } from '../data/incidentCode.js'

// Código público del reporte como un campo más del detalle ("Código: …"),
// con botón para copiarlo y un "?" que explica qué significa cada parte.
// (En las tarjetas de la lista se muestra solo el texto: la tarjeta entera es
// un botón y no puede llevar otro botón adentro.)
export default function IncidentCode({ incident }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const id = useId()
  if (!incident.code) return null
  const e = explainCode(incident)

  async function copy() {
    try {
      await navigator.clipboard.writeText(incident.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('Copia el código del reporte:', incident.code)
    }
  }

  return (
    <div className="incident-code">
      <div className="detail-meta incident-code-row">
        <b>Código:</b> <span className="code-text">{incident.code}</span>
        <button
          type="button"
          className="help-btn"
          onClick={copy}
          aria-label={copied ? 'Código copiado' : 'Copiar código'}
          title={copied ? 'Copiado' : 'Copiar código'}
        >
          {copied ? <FiCheck /> : <FiCopy />}
        </button>
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
