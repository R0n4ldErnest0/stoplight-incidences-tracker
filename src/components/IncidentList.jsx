import { useEffect, useState } from 'react'
import { FiCamera, FiCalendar, FiRefreshCw, FiClock, FiFlag, FiEyeOff, FiHash, FiUser, FiChevronDown } from 'react-icons/fi'
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

// Se muestran de a 20: con cientos de reportes, dibujar todas las tarjetas
// (y descargar todas sus fotos) de una vez haría la lista lenta en el teléfono.
const PAGE_SIZE = 20

export default function IncidentList({ incidents, onSelect, myIds, pageKey, filtered }) {
  const [shown, setShown] = useState(PAGE_SIZE)
  // Nueva búsqueda o filtro -> vuelve a la primera página.
  useEffect(() => setShown(PAGE_SIZE), [pageKey])

  if (incidents.length === 0) {
    return (
      <div className="list-empty">
        {filtered
          ? 'Ningún reporte coincide con la búsqueda o los filtros.'
          : 'Todavía no hay reportes.'}
      </div>
    )
  }

  const page = incidents.slice(0, shown)
  const remaining = incidents.length - page.length

  return (
    <div className="list-wrap">
      <div className="list-count">
        {remaining > 0
          ? `Mostrando ${page.length} de ${incidents.length} reportes`
          : `${incidents.length} reporte(s)`}
      </div>
      <div className="list">
        {page.map((inc) => {
          const age = ageDays(inc)
          const overdue = age > 90 && inc.status !== 'resolved'
          return (
            <button key={inc.id} className="card" onClick={() => onSelect(inc.id)}>
              <div className="card-thumb">
                {inc.photo ? (
                  <img src={inc.photo} alt="" loading="lazy" decoding="async" />
                ) : (
                  <span className="card-thumb-empty">🚦</span>
                )}
                {inc.photos?.length > 1 && (
                  <span className="thumb-count"><FiCamera /> {inc.photos.length}</span>
                )}
              </div>
              <div className="card-body">
                <div className="card-top">
                  <strong className="card-title">{inc.title}</strong>
                  <StatusBadge status={inc.status} />
                </div>
                <div className="card-tags">
                  {inc.code && <span className="tag tag-code"><FiHash /> {inc.code}</span>}
                  {myIds?.has(inc.id) && <span className="tag tag-mine"><FiUser /> Mi reporte</span>}
                  <span className="tag">{faultLabel(inc.faultType)}</span>
                  <span className="tag">{inc.district}</span>
                  {/* Moderación visible para todos: marcado (1 reporte) u oculto (2+). */}
                  {inc.hidden ? (
                    <span className="tag tag-flag"><FiEyeOff /> Oculto · en revisión</span>
                  ) : inc.flags > 0 ? (
                    <span className="tag tag-flag"><FiFlag /> Marcado · en revisión</span>
                  ) : null}
                </div>
                {inc.description && <p className="card-desc">{inc.description}</p>}
                <div className="card-dates">
                  <span><FiCalendar /> Reportado: <b>{fmtDate(inc.createdAt)}</b></span>
                  <span><FiRefreshCw /> Actualizado: <b>{fmtDate(lastUpdate(inc))}</b></span>
                  <span className={overdue ? 'age-flag' : ''}>
                    <FiClock /> {age} día(s){overdue ? ' sin resolver' : ''}
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>
      {remaining > 0 && (
        <button type="button" className="btn list-more" onClick={() => setShown((n) => n + PAGE_SIZE)}>
          <FiChevronDown /> Ver más ({Math.min(PAGE_SIZE, remaining)} de {remaining} restantes)
        </button>
      )}
    </div>
  )
}
