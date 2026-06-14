import { STATUSES, STATUS_ORDER, FAULT_TYPES } from '../constants.js'
import { updateStatus, ageDays } from '../data/store.js'
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

  function setStatus(status) {
    const note = isAdmin ? 'Actualizado por la autoridad' : ''
    const updated = updateStatus(incident.id, status, note)
    onChanged(updated)
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <h2>{incident.title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        <div className="drawer-body">
          {incident.photo ? (
            <img className="detail-photo" src={incident.photo} alt="Semáforo reportado" />
          ) : (
            <div className="detail-photo" style={{ display: 'grid', placeItems: 'center', height: 160, color: 'var(--muted)' }}>
              Sin foto
            </div>
          )}

          <div style={{ marginBottom: 10 }}>
            <StatusBadge status={incident.status} />{' '}
            {age > 90 && incident.status !== 'resolved' && (
              <span className="age-flag">⚠ {age} días sin resolver</span>
            )}
          </div>

          <p className="detail-meta"><b>Falla:</b> {faultLabel(incident.faultType)}</p>
          <p className="detail-meta"><b>Distrito:</b> {incident.district}</p>
          <p className="detail-meta"><b>Reportado:</b> {fmtDate(incident.createdAt)} ({age} días)</p>
          {incident.description && <p style={{ marginTop: 12 }}>{incident.description}</p>}

          <div style={{ marginTop: 14 }}>
            <a className="btn btn-sm" href={gmaps} target="_blank" rel="noreferrer">
              🧭 Abrir en Google Maps
            </a>
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
