import { FiFlag, FiEyeOff, FiTrash2 } from 'react-icons/fi'
import ModerationActions, { removalReasonLabel } from './ModerationActions.jsx'

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

function StaffCard({ incident, onSelect, onChanged, children }) {
  return (
    <div className="staff-card">
      <button type="button" className="staff-card-main" onClick={() => onSelect(incident.id)}>
        <div className="staff-thumb">
          {incident.photo ? <img src={incident.photo} alt="" /> : <span>🚦</span>}
        </div>
        <div className="staff-card-body">
          <strong>{incident.title}</strong>
          <div className="staff-meta">
            {incident.district} · reportado el {fmtDate(incident.createdAt)}
          </div>
          {children}
        </div>
      </button>
      <ModerationActions incident={incident} onChanged={onChanged} />
    </div>
  )
}

// Vista solo para revisores: la cola de moderación. Recibe TODOS los reportes
// (con sesión de revisor la BD también entrega los ocultos y retirados).
export default function ModerationView({ incidents, onSelect, onChanged }) {
  const pending = incidents
    .filter((i) => !i.removedAt && (i.flags > 0 || i.hidden))
    .sort((a, b) => b.flags - a.flags || new Date(a.createdAt) - new Date(b.createdAt))
  const removed = incidents
    .filter((i) => i.removedAt)
    .sort((a, b) => new Date(b.removedAt) - new Date(a.removedAt))

  return (
    <div className="list-wrap staff-wrap">
      <section className="staff-section">
        <h2 className="staff-title">Pendientes de revisión ({pending.length})</h2>
        <p className="help">
          Reportes marcados por la comunidad, los más reportados primero. Con 2 o más
          reportes salen de la vista por defecto hasta que decidas.
        </p>
        {pending.length === 0 ? (
          <div className="list-empty staff-empty">No hay reportes pendientes. 🎉</div>
        ) : (
          pending.map((inc) => (
            <StaffCard key={inc.id} incident={inc} onSelect={onSelect} onChanged={onChanged}>
              <div className="card-tags">
                <span className="tag tag-flag"><FiFlag /> {inc.flags} reporte(s)</span>
                {inc.hidden && <span className="tag tag-flag"><FiEyeOff /> Oculto</span>}
              </div>
            </StaffCard>
          ))
        )}
      </section>

      <section className="staff-section">
        <h2 className="staff-title">Retirados ({removed.length})</h2>
        <p className="help">
          No son visibles para el público. Puedes deshacer un retiro, pero las fotos
          ya no se recuperan.
        </p>
        {removed.length === 0 ? (
          <div className="list-empty staff-empty">Ningún reporte retirado.</div>
        ) : (
          removed.map((inc) => (
            <StaffCard key={inc.id} incident={inc} onSelect={onSelect} onChanged={onChanged}>
              <div className="card-tags">
                <span className="tag tag-flag">
                  <FiTrash2 /> {removalReasonLabel(inc.removedReason)} · {fmtDate(inc.removedAt)}
                </span>
              </div>
            </StaffCard>
          ))
        )}
      </section>
    </div>
  )
}
