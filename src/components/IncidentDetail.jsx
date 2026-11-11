import { useState } from 'react'
import { FiX, FiFlag, FiAlertTriangle, FiExternalLink, FiShare2, FiCheckCircle, FiTrash2 } from 'react-icons/fi'
import { FaWhatsapp } from 'react-icons/fa'
import { STATUSES, STATUS_ORDER, FAULT_TYPES } from '../constants.js'
import { updateStatus, flagIncident, restoreIncident, deleteIncident, ageDays } from '../data/store.js'
import { titleCase } from '../data/peru.js'
import { buildWhatsappReportUrl, shareablePhotoUrls, AUTHORITIES } from '../data/whatsapp.js'
import { buildIncidentUrl } from '../shareLink.js'
import { useBackClose } from '../useBackClose.js'
import StatusBadge from './StatusBadge.jsx'

function fmtDate(iso) {
  return new Date(iso).toLocaleString('es-PE', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function faultLabel(key) {
  return FAULT_TYPES.find((f) => f.key === key)?.label || 'Otro'
}

// Recuerda en este dispositivo qué reportes ya marcó la persona, para no
// volver a ofrecerle el botón al reabrirlos. Es solo una ayuda de UI: no
// impide marcar de nuevo desde otro navegador (eso requeriría control en la BD).
const FLAGGED_KEY = 'semaforo-alerta:flagged:v1'

function loadFlaggedIds() {
  try {
    return JSON.parse(localStorage.getItem(FLAGGED_KEY)) || []
  } catch {
    return []
  }
}

function rememberFlagged(id) {
  const ids = loadFlaggedIds()
  if (!ids.includes(id)) localStorage.setItem(FLAGGED_KEY, JSON.stringify([...ids, id]))
}

export default function IncidentDetail({ incident, isAdmin, onClose, onChanged }) {
  const age = ageDays(incident)
  const gmaps = `https://www.google.com/maps/search/?api=1&query=${incident.lat},${incident.lng}`
  // Línea de ubicación: Distrito, Provincia, Departamento (lo que exista).
  const lugar = [incident.district, incident.provincia, incident.departamento]
    .filter((x) => x && x !== 'Otro')
    .map(titleCase)
    .join(', ')
  // Soporta reportes con varias fotos; cae a `photo` para filas antiguas.
  const photos = incident.photos?.length
    ? incident.photos
    : incident.photo
      ? [incident.photo]
      : []

  const [flagged, setFlagged] = useState(() => loadFlaggedIds().includes(incident.id))
  // true solo justo después de marcar (para el "Gracias"); al reabrir, otro texto.
  const [justFlagged, setJustFlagged] = useState(false)
  const [flagging, setFlagging] = useState(false)
  const [copied, setCopied] = useState(false)
  const [moderating, setModerating] = useState(false)

  const shareUrl = buildIncidentUrl(incident.id)

  // El botón "atrás" del teléfono cierra este detalle. Le pasamos el link
  // compartible como URL de esa entrada del historial, así la barra de
  // direcciones lo refleja mientras está abierto — por eso todo cierre (×,
  // fondo) usa history.back() en vez de onClose directo: así el navegador
  // revierte la URL solo, en vez de dejarla apuntando a este reporte.
  useBackClose(onClose, shareUrl)
  const close = () => window.history.back()

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: incident.title, url: shareUrl })
      } catch {
        // el usuario canceló el share sheet — no es un error
      }
      return
    }
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('Copia el link del reporte:', shareUrl)
    }
  }

  async function setStatus(status) {
    const note = isAdmin ? 'Actualizado por la autoridad' : ''
    try {
      const updated = await updateStatus(incident.id, status, note)
      onChanged(updated)
    } catch (err) {
      console.error(err)
      alert('No se pudo actualizar el estado: ' + (err.message || 'error'))
    }
  }

  // Reporta el contenido como inapropiado/falso. Al acumular varios reportes,
  // la BD lo oculta del mapa público hasta que un revisor lo verifique.
  async function flag() {
    if (flagged || flagging) return
    const ok = window.confirm(
      '¿Reportar este contenido como inapropiado o falso? Un revisor lo verificará.'
    )
    if (!ok) return
    setFlagging(true)
    try {
      await flagIncident(incident.id)
      rememberFlagged(incident.id)
      setFlagged(true)
      setJustFlagged(true)
      // Recarga la lista para que el conteo de reportes quede al día (si no,
      // un revisor en esta misma pestaña seguiría viendo el conteo viejo).
      onChanged()
    } catch (err) {
      console.error(err)
      alert('No se pudo enviar el reporte: ' + (err.message || 'error'))
    } finally {
      setFlagging(false)
    }
  }

  // Resuelve un reporte marcado por la comunidad: un revisor decide si es
  // spam/abuso real (lo elimina) o no (lo restaura, limpiando los reportes).
  async function restore() {
    if (moderating) return
    setModerating(true)
    try {
      const updated = await restoreIncident(incident.id)
      onChanged(updated)
    } catch (err) {
      console.error(err)
      alert('No se pudo restaurar el reporte: ' + (err.message || 'error'))
    } finally {
      setModerating(false)
    }
  }

  async function remove() {
    if (moderating) return
    const ok = window.confirm('¿Eliminar este reporte de forma permanente? Esta acción no se puede deshacer.')
    if (!ok) return
    setModerating(true)
    try {
      await deleteIncident(incident.id)
      onChanged()
      close()
    } catch (err) {
      console.error(err)
      alert('No se pudo eliminar el reporte: ' + (err.message || 'error'))
      setModerating(false)
    }
  }

  return (
    <div className="overlay" onClick={close}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <h2>{incident.title}</h2>
          <button className="icon-btn" onClick={close} aria-label="Cerrar"><FiX /></button>
        </div>
        <div className="drawer-body">
          {photos.length > 0 ? (
            <div className={photos.length > 1 ? 'detail-gallery' : ''}>
              {photos.map((src, i) => (
                <a key={i} href={src} target="_blank" rel="noreferrer">
                  <img className="detail-photo" src={src} alt={`Semáforo reportado ${i + 1}`} />
                </a>
              ))}
            </div>
          ) : (
            <div className="detail-photo" style={{ display: 'grid', placeItems: 'center', height: 160, color: 'var(--muted)' }}>
              Sin foto
            </div>
          )}

          <div style={{ marginBottom: 10 }}>
            <StatusBadge status={incident.status} />{' '}
            {age > 90 && incident.status !== 'resolved' && (
              <span className="age-flag"><FiAlertTriangle /> {age} días sin resolver</span>
            )}
          </div>

          {isAdmin && incident.flags > 0 && (
            <div className="warn" style={{ marginBottom: 10 }}>
              <FiFlag /> {incident.flags} reporte(s) de la comunidad
              {incident.hidden ? ' · OCULTO del público hasta revisión' : ''}
              <div className="admin-actions" style={{ marginTop: 10 }}>
                <button type="button" className="btn btn-sm" onClick={restore} disabled={moderating}>
                  <FiCheckCircle /> No es spam — restaurar
                </button>
                <button type="button" className="btn btn-sm btn-danger" onClick={remove} disabled={moderating}>
                  <FiTrash2 /> Eliminar reporte
                </button>
              </div>
            </div>
          )}

          <p className="detail-meta"><b>Falla:</b> {faultLabel(incident.faultType)}</p>
          {lugar && <p className="detail-meta"><b>Ubicación:</b> {lugar}</p>}
          <p className="detail-meta"><b>Reportado:</b> {fmtDate(incident.createdAt)} ({age} días)</p>
          {incident.description && <p style={{ marginTop: 12 }}>{incident.description}</p>}

          <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <a className="btn btn-sm" href={gmaps} target="_blank" rel="noreferrer">
              <FiExternalLink /> Abrir en Google Maps
            </a>
            {AUTHORITIES.map((auth) => (
              <a
                key={auth.id}
                className="btn btn-sm btn-whatsapp"
                href={buildWhatsappReportUrl(incident, auth)}
                target="_blank"
                rel="noreferrer"
                title={`Abre WhatsApp con el reporte prellenado para ${auth.description} — revísalo y toca enviar`}
              >
                <FaWhatsapp /> Enviar a {auth.label} por WhatsApp
              </a>
            ))}
            <button type="button" className="btn btn-sm" onClick={share}>
              <FiShare2 /> {copied ? '¡Link copiado!' : 'Compartir'}
            </button>
          </div>
          {photos.length > 0 && (
            <div className="help" style={{ marginTop: 6 }}>
              {shareablePhotoUrls(incident).length > 0
                ? 'El mensaje de WhatsApp ya incluye el link a la(s) foto(s).'
                : 'WhatsApp no permite adjuntar fotos desde un link — después de tocar enviar, adjunta la(s) foto(s) manualmente en el chat.'}
            </div>
          )}

          <div className="report-abuse">
            {flagged ? (
              <span className="report-abuse-done">
                {justFlagged
                  ? '✓ Gracias. Un revisor lo verificará.'
                  : '✓ Ya reportaste este contenido · en revisión'}
              </span>
            ) : (
              <button
                type="button"
                className="report-abuse-btn"
                onClick={flag}
                disabled={flagging}
              >
                <FiFlag /> {flagging ? 'Enviando…' : 'Reportar contenido inapropiado'}
              </button>
            )}
          </div>

          <div className="section-title">Historial</div>
          <ul className="timeline">
            {incident.history.map((h, i) => {
              const s = STATUSES[h.status] || STATUSES.reported
              return (
                <li key={i}>
                  <span className="tl-dot" style={{ background: s.color }} />
                  <div><StatusBadge status={h.status} /></div>
                  <div className="tl-when">{fmtDate(h.at)}</div>
                  {h.note && <div className="tl-note">{h.note}</div>}
                </li>
              )
            })}
          </ul>

          {isAdmin && (
            <>
              <div className="section-title">Acciones de la autoridad</div>
              <div className="admin-actions">
                {STATUS_ORDER.map((key) => (
                  <button
                    key={key}
                    className="btn btn-sm"
                    disabled={incident.status === key}
                    onClick={() => setStatus(key)}
                  >
                    {STATUSES[key].label}
                  </button>
                ))}
                <button
                  className="btn btn-sm"
                  disabled={incident.status === 'duplicate'}
                  onClick={() => setStatus('duplicate')}
                >
                  Marcar duplicado
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
