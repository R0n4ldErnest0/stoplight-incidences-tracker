import { useState } from 'react'
import { FiArrowRight, FiClock, FiFlag } from 'react-icons/fi'
import { STATUSES, STATUS_ORDER, FAULT_TYPES } from '../constants.js'
import { updateStatus, ageDays } from '../data/store.js'

// Estados en los que un reporte todavía requiere acción de la autoridad.
const ACTIVE = ['reported', 'acknowledged', 'in_progress']

function faultLabel(key) {
  return FAULT_TYPES.find((f) => f.key === key)?.label || 'Otro'
}

// Vista solo para la autoridad: los reportes activos agrupados por estado, los
// más antiguos primero, con un botón para pasarlos al siguiente estado del
// ciclo (Reportado → Revisado → En reparación → Resuelto).
export default function ManageView({ incidents, onSelect, onChanged }) {
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')

  async function advance(incident, next) {
    if (busyId) return
    setBusyId(incident.id)
    setError('')
    try {
      await updateStatus(incident.id, next, 'Actualizado por la autoridad')
      onChanged()
    } catch (err) {
      console.error(err)
      setError('No se pudo actualizar el estado: ' + (err.message || 'error'))
    } finally {
      setBusyId(null)
    }
  }

  const active = incidents.filter((i) => !i.removedAt && ACTIVE.includes(i.status))

  return (
    <div className="list-wrap staff-wrap">
      <p className="help">
        Reportes que esperan acción, los más antiguos primero. Para marcar un
        duplicado o volver a un estado anterior, abre el reporte.
      </p>
      {error && <div className="mod-error">{error}</div>}
      <div className="manage-cols">
        {ACTIVE.map((status) => {
          const next = STATUS_ORDER[STATUS_ORDER.indexOf(status) + 1]
          const items = active
            .filter((i) => i.status === status)
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
          return (
            <section key={status} className="manage-col">
              <h2 className="staff-title">
                <span className="mf-dot" style={{ background: STATUSES[status].color }} />
                {STATUSES[status].label} ({items.length})
              </h2>
              {items.length === 0 && <div className="list-empty staff-empty">Nada aquí.</div>}
              {items.map((inc) => {
                const age = ageDays(inc)
                return (
                  <div key={inc.id} className="staff-card">
                    <button type="button" className="staff-card-main" onClick={() => onSelect(inc.id)}>
                      <div className="staff-card-body">
                        <strong>{inc.title}</strong>
                        <div className="staff-meta">
                          {inc.district} · {faultLabel(inc.faultType)}
                        </div>
                        <div className="card-tags">
                          <span className={age > 90 ? 'tag age-flag' : 'tag'}>
                            <FiClock /> {age} día(s)
                          </span>
                          {inc.flags > 0 && (
                            <span className="tag tag-flag"><FiFlag /> Marcado</span>
                          )}
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => advance(inc, next)}
                      disabled={busyId !== null}
                    >
                      {busyId === inc.id ? 'Guardando…' : <>Pasar a {STATUSES[next].label} <FiArrowRight /></>}
                    </button>
                  </div>
                )
              })}
            </section>
          )
        })}
      </div>
    </div>
  )
}
