import { useEffect, useMemo, useState } from 'react'
import MapView from './components/MapView.jsx'
import IncidentList from './components/IncidentList.jsx'
import ReportForm from './components/ReportForm.jsx'
import IncidentDetail from './components/IncidentDetail.jsx'
import { listIncidents, getStats } from './data/store.js'
import { STATUSES, STATUS_ORDER } from './constants.js'

export default function App() {
  const [incidents, setIncidents] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [showReport, setShowReport] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [filter, setFilter] = useState('all')
  const [view, setView] = useState('map') // 'map' | 'list'

  function refresh() {
    setIncidents(listIncidents())
  }

  useEffect(() => {
    refresh()
  }, [])

  const stats = useMemo(() => getStats(), [incidents])

  const visible = useMemo(() => {
    if (filter === 'all') return incidents
    return incidents.filter((i) => i.status === filter)
  }, [incidents, filter])

  const selected = incidents.find((i) => i.id === selectedId) || null

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <img src="/icon.svg" alt="" />
          <div>
            SemáforoAlerta
            <small>Mapa ciudadano de semáforos malogrados · Lima</small>
          </div>
        </div>
        <div className="spacer" />
        <div className="viewtabs">
          <button
            className={view === 'map' ? 'viewtab active' : 'viewtab'}
            onClick={() => setView('map')}
          >
            🗺️ Mapa
          </button>
          <button
            className={view === 'list' ? 'viewtab active' : 'viewtab'}
            onClick={() => setView('list')}
          >
            📋 Lista
          </button>
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={isAdmin}
            onChange={(e) => setIsAdmin(e.target.checked)}
          />
          Modo autoridad
        </label>
      </header>

      <div className="stats">
        <button
          className="stat"
          style={{ borderColor: filter === 'all' ? 'var(--accent)' : 'var(--border)' }}
          onClick={() => setFilter('all')}
        >
          <b>{stats.total}</b> Total
        </button>
        {STATUS_ORDER.map((key) => (
          <button
            key={key}
            className="stat"
            style={{ borderColor: filter === key ? STATUSES[key].color : 'var(--border)' }}
            onClick={() => setFilter(key)}
          >
            <b style={{ color: STATUSES[key].color }}>{stats.byStatus[key] || 0}</b>
            {STATUSES[key].label}
          </button>
        ))}
        {stats.avgDays != null && (
          <div className="stat"><b>{stats.avgDays}</b> días prom. a resolver</div>
        )}
      </div>

      <div className="content">
        {view === 'map' ? (
          <MapView incidents={visible} onSelect={setSelectedId} />
        ) : (
          <IncidentList incidents={visible} onSelect={setSelectedId} />
        )}

        <button className="btn btn-primary fab" onClick={() => setShowReport(true)}>
          + Reportar semáforo
        </button>

        {showReport && (
          <ReportForm
            onClose={() => setShowReport(false)}
            onCreated={(inc) => {
              setShowReport(false)
              refresh()
              setSelectedId(inc.id)
            }}
          />
        )}

        {selected && (
          <IncidentDetail
            incident={selected}
            isAdmin={isAdmin}
            onClose={() => setSelectedId(null)}
            onChanged={() => refresh()}
          />
        )}
      </div>
    </div>
  )
}
