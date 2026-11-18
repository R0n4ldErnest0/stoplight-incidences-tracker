import { useState } from 'react'
import { FiCheckCircle, FiCopy, FiShare2, FiEye, FiX } from 'react-icons/fi'
import { buildIncidentUrl } from '../shareLink.js'
import { useBackClose } from '../useBackClose.js'
import IncidentCode from './IncidentCode.jsx'

// Pantalla de confirmación al publicar: lo importante es que la persona se
// lleve el CÓDIGO del reporte, para poder seguirlo después (la lista
// "Mis reportes" de este dispositivo es solo una ayuda: se pierde si se
// borran los datos del navegador).
export default function ReportSuccess({ incident, onClose, onView }) {
  useBackClose(onClose)
  const [copied, setCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const shareUrl = buildIncidentUrl(incident.id)

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(incident.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('Copia el código de tu reporte:', incident.code)
    }
  }

  async function share() {
    const text = `Reporté un semáforo malogrado en SemáforoAlerta. Código: ${incident.code}`
    if (navigator.share) {
      try {
        await navigator.share({ title: incident.title, text, url: shareUrl })
      } catch {
        // el usuario canceló el share sheet — no es un error
      }
      return
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${shareUrl}`)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch {
      window.prompt('Copia el link de tu reporte:', shareUrl)
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="drawer report-success" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <h2><FiCheckCircle className="success-icon" /> ¡Reporte publicado!</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar"><FiX /></button>
        </div>
        <div className="drawer-body">
          <p className="success-lead">
            Gracias. Tu reporte ya está en el mapa público. <b>Guarda este código</b> para seguir
            su estado:
          </p>
          {incident.code ? (
            <IncidentCode incident={incident} large />
          ) : (
            <p className="help">El código se mostrará en el detalle del reporte.</p>
          )}
          <div className="success-actions">
            {incident.code && (
              <button type="button" className="btn" onClick={copyCode}>
                <FiCopy /> {copied ? '¡Copiado!' : 'Copiar código'}
              </button>
            )}
            <button type="button" className="btn" onClick={share}>
              <FiShare2 /> {linkCopied ? '¡Link copiado!' : 'Compartir'}
            </button>
          </div>
          <p className="help">
            También lo encontrarás en <b>Lista → Mis reportes</b> en este dispositivo. Si cambias de
            teléfono o borras los datos del navegador, búscalo por su código.
          </p>
          <button type="button" className="btn btn-primary btn-block btn-lg" onClick={onView}>
            <FiEye /> Ver mi reporte
          </button>
        </div>
      </div>
    </div>
  )
}
