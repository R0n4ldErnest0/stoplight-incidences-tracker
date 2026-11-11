import { useState } from 'react'
import { FiCheckCircle, FiTrash2 } from 'react-icons/fi'
import { REMOVAL_REASONS } from '../constants.js'
import { restoreIncident, removeIncident } from '../data/store.js'

export function removalReasonLabel(key) {
  return REMOVAL_REASONS.find((r) => r.key === key)?.label || 'Otro motivo'
}

// Acciones de moderación de un revisor sobre un reporte, compartidas entre el
// detalle (IncidentDetail) y la vista Moderación. Retirar es un borrado lógico
// (ver removeIncident): pide un motivo en línea, sin window.confirm.
export default function ModerationActions({ incident, onChanged }) {
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [reason, setReason] = useState(REMOVAL_REASONS[0].key)
  const [error, setError] = useState('')

  const removed = Boolean(incident.removedAt)
  const canRestore = removed || incident.hidden || incident.flags > 0

  async function run(action) {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await action()
      setConfirming(false)
      onChanged()
    } catch (err) {
      console.error(err)
      setError('No se pudo completar la acción: ' + (err.message || 'error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mod-actions">
      {!confirming && (
        <div className="admin-actions">
          {canRestore && (
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => run(() => restoreIncident(incident.id))}
              disabled={busy}
            >
              <FiCheckCircle /> {removed ? 'Deshacer retiro' : 'No es abuso — restaurar'}
            </button>
          )}
          {!removed && (
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={() => setConfirming(true)}
              disabled={busy}
            >
              <FiTrash2 /> Retirar reporte
            </button>
          )}
        </div>
      )}

      {confirming && (
        <div className="mod-confirm">
          <label className="mod-confirm-label">
            Motivo del retiro
            <select value={reason} onChange={(e) => setReason(e.target.value)} disabled={busy}>
              {REMOVAL_REASONS.map((r) => (
                <option key={r.key} value={r.key}>{r.label}</option>
              ))}
            </select>
          </label>
          <div className="help">
            El reporte deja de ser visible para el público (se puede deshacer), y sus
            fotos se borran de forma permanente.
          </div>
          <div className="admin-actions">
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={() => run(() => removeIncident(incident.id, reason))}
              disabled={busy}
            >
              <FiTrash2 /> {busy ? 'Retirando…' : 'Confirmar retiro'}
            </button>
            <button type="button" className="btn btn-sm" onClick={() => setConfirming(false)} disabled={busy}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {error && <div className="mod-error">{error}</div>}
    </div>
  )
}
