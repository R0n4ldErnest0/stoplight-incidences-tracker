import { useState } from 'react'
import { FiX, FiFlag, FiAlertTriangle, FiExternalLink, FiShare2 } from 'react-icons/fi'
import { FaWhatsapp } from 'react-icons/fa'
import { STATUSES, STATUS_ORDER, FAULT_TYPES } from '../constants.js'
import { updateStatus, flagIncident, ageDays } from '../data/store.js'
import { titleCase } from '../data/peru.js'
import { buildWhatsappReportUrl } from '../data/whatsapp.js'
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

  const [flagged, setFlagged] = useState(false)
  const [flagging, setFlagging] = useState(false)
  const [copied, setCopied] = useState(false)

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
      setFlagged(true)
    } catch (err) {
      console.error(err)
      alert('No se pudo enviar el reporte: ' + (err.message || 'error'))
    } finally {
      setFlagging(false)
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
            <a
              className="btn btn-sm btn-whatsapp"
              href={buildWhatsappReportUrl(incident)}
              target="_blank"
              rel="noreferrer"
              title="Abre WhatsApp con el reporte prellenado — revísalo y toca enviar"
            >
              <FaWhatsapp /> Enviar también a la autoridad por WhatsApp
            </a>
            <button type="button" className="btn btn-sm" onClick={share}>
              <FiShare2 /> {copied ? '¡Link copiado!' : 'Compartir'}
            </button>
          </div>

          <div className="report-abuse">
            {flagged ? (
              <span className="report-abuse-done">✓ Gracias. Un revisor lo verificará.</span>
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
