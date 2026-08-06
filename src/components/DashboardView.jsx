import { useMemo } from 'react'
import { FiClock } from 'react-icons/fi'
import { computeDashboard, ageDays } from '../data/helpers.js'
import { STATUSES, STATUS_ORDER, FAULT_TYPES } from '../constants.js'
import StatusBadge from './StatusBadge.jsx'

function faultLabel(key) {
  return FAULT_TYPES.find((f) => f.key === key)?.label || key
}

// Tarjeta de métrica grande.
function Metric({ value, label, sub, color }) {
  return (
    <div className="metric">
      <div className="metric-value" style={color ? { color } : undefined}>{value}</div>
      <div className="metric-label">{label}</div>
      {sub && <div className="metric-sub">{sub}</div>}
    </div>
  )
}

export default function DashboardView({ incidents, onSelect }) {
  const d = useMemo(() => computeDashboard(incidents), [incidents])

  if (d.total === 0) {
    return (
      <div className="list-empty">
        Aún no hay incidencias. El panel se llenará cuando lleguen reportes.
      </div>
    )
  }

  const maxStatus = Math.max(...STATUS_ORDER.map((k) => d.byStatus[k] || 0), 1)
  const maxDistrict = Math.max(...d.byDistrict.map((x) => x.total), 1)
  const faultEntries = Object.entries(d.byFault).sort((a, b) => b[1] - a[1])
  const maxFault = Math.max(...faultEntries.map(([, n]) => n), 1)

  return (
    <div className="dash-wrap">
      <div className="dash">
        <h3 className="dash-h">Panel de transparencia</h3>
        <p className="dash-sub">
          Visibilidad pública del estado de los semáforos reportados y de la respuesta de la autoridad.
        </p>

        {/* Métricas principales */}
        <div className="metrics">
          <Metric value={d.total} label="Reportes totales" />
          <Metric value={d.active} label="Sin resolver" color="#ef4444" />
          <Metric value={d.resolved} label="Resueltos" color="#22c55e" />
          <Metric value={`${d.resolutionRate}%`} label="Tasa de resolución" />
          <Metric value={`${d.responseRate}%`} label="Tasa de respuesta" sub="salieron de 'reportado'" />
          <Metric
            value={d.avgDays != null ? `${d.avgDays}` : '—'}
            label="Días prom. a resolver"
            sub={d.avgDays == null ? 'sin datos aún' : undefined}
          />
        </div>

        {/* Reparto por estado */}
        <h4 className="dash-section">Por estado</h4>
        <div className="bars">
          {STATUS_ORDER.map((k) => {
            const n = d.byStatus[k] || 0
            return (
              <div className="bar-row" key={k}>
                <span className="bar-label">{STATUSES[k].label}</span>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ width: `${(n / maxStatus) * 100}%`, background: STATUSES[k].color }}
                  />
                </div>
                <span className="bar-value">{n}</span>
              </div>
            )
          })}
        </div>

        {/* Semáforos más antiguos sin resolver — el ángulo de rendición de cuentas */}
        <h4 className="dash-section"><FiClock /> Más antiguos sin resolver</h4>
        <div className="oldest">
          {d.oldestUnresolved.length === 0 && (
            <p className="dash-sub">No hay incidencias activas. 🎉</p>
          )}
          {d.oldestUnresolved.map((inc) => {
            const age = ageDays(inc)
            return (
              <button key={inc.id} className="oldest-row" onClick={() => onSelect(inc.id)}>
                <span className={'oldest-age' + (age > 90 ? ' age-flag' : '')}>{age}d</span>
                <span className="oldest-title">{inc.title}</span>
                <span className="tag">{inc.district}</span>
                <StatusBadge status={inc.status} />
              </button>
            )
          })}
        </div>

        {/* Desglose por distrito */}
        <h4 className="dash-section">Por distrito</h4>
        <div className="district-table">
          <div className="district-head">
            <span>Distrito</span>
            <span>Total</span>
            <span>Sin resolver</span>
            <span>Resueltos</span>
            <span>Días prom.</span>
          </div>
          {d.byDistrict.map((row) => (
            <div className="district-row" key={row.district}>
              <span className="district-name">
                {row.district}
                <span className="district-bar">
                  <span style={{ width: `${(row.total / maxDistrict) * 100}%` }} />
                </span>
              </span>
              <span>{row.total}</span>
              <span style={{ color: row.active ? '#ef4444' : 'var(--muted)' }}>{row.active}</span>
              <span style={{ color: row.resolved ? '#22c55e' : 'var(--muted)' }}>{row.resolved}</span>
              <span>{row.avgDays != null ? `${row.avgDays}d` : '—'}</span>
            </div>
          ))}
        </div>

        {/* Tipos de falla: histograma para ver de un vistazo cuáles se repiten más. */}
        <h4 className="dash-section">Tipos de falla</h4>
        <div className="bars">
          {faultEntries.map(([k, n]) => (
            <div className="bar-row" key={k}>
              <span className="bar-label">{faultLabel(k)}</span>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{ width: `${(n / maxFault) * 100}%`, background: 'var(--accent)' }}
                />
              </div>
              <span className="bar-value">{n}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
