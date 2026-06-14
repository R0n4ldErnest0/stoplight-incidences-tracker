import { STATUSES, FAULT_TYPES } from '../constants.js'
import { ageDays } from '../data/store.js'
import StatusBadge from './StatusBadge.jsx'

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('es-PE', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function faultLabel(key) {
  return FAULT_TYPES.find((f) => f.key === key)?.label || 'Otro'
}

function lastUpdate(incident) {
  return incident.history[incident.history.length - 1]?.at || incident.createdAt
}

export default function IncidentList({ incidents, onSelect }) {
  if (incidents.length === 0) {
    return (
      <div className="list-empty">
        No hay incidencias para este filtro.
      </div>
    )
  }

  return (
    <div className="list-wrap">
      <div className="list-count">{incidents.length} incidencia(s)</div>
      <div className="list">
        {incidents.map((inc) => {
          const age = ageDays(inc)
          const overdue = age > 90 && inc.status !== 'resolved'
          return (
            <button key={inc.id} className="card" onClick={() => onSelect(inc.id)}>
              <div className="card-thumb">
                {inc.photo ? (
                  <img src={inc.photo} alt="" />
                ) : (
                  <span className="card-thumb-empty">🚦</span>
                )}
              </div>
              <div className="card-body">
                <div className="card-top">
                  <strong className="card-title">{inc.title}</strong>
                  <StatusBadge status={inc.status} />
                </div>
                <div className="card-tags">
                  <span className="tag">{faultLabel(inc.faultType)}</span>
                  <span className="tag">{inc.district}</span>
                </div>
                {inc.description && <p className="card-desc">{inc.description}</p>}
                <div className="card-dates">
                  <span>📅 Reportado: <b>{fmtDate(inc.createdAt)}</b></span>
                  <span>🔄 Actualizado: <b>{fmtDate(lastUpdate(inc))}</b></span>
                  <span className={overdue ? 'age-flag' : ''}>
                    ⏱ {age} día(s){overdue ? ' sin resolver' : ''}
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
