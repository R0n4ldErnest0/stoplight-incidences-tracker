import { useEffect, useMemo, useState } from 'react'
import MapView from './components/MapView.jsx'
import IncidentList from './components/IncidentList.jsx'
import DashboardView from './components/DashboardView.jsx'
import AboutView from './components/AboutView.jsx'
import ReportForm from './components/ReportForm.jsx'
import IncidentDetail from './components/IncidentDetail.jsx'
import AuthModal from './components/AuthModal.jsx'
import { listIncidents, getStats, DATA_SOURCE } from './data/store.js'
import { initAuth, onAuthChange, getAuthState } from './data/auth.js'
import { STATUSES, STATUS_ORDER, DATE_RANGES } from './constants.js'

const EMPTY_STATS = { total: 0, byStatus: {}, avgDays: null }

export default function App() {
  const [incidents, setIncidents] = useState([])
  const [stats, setStats] = useState(EMPTY_STATS)
  const [selectedId, setSelectedId] = useState(null)
  const [showReport, setShowReport] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [filter, setFilter] = useState('all')
  const [dateRange, setDateRange] = useState('all')
  const [view, setView] = useState('map') // 'map' | 'list' | 'dashboard' | 'about'
  const [loading, setLoading] = useState(true)
  const [dataError, setDataError] = useState('')
  const [authState, setAuthState] = useState({ user: null, isReviewer: false, loading: true })

  async function refresh() {
    try {
      const [list, s] = await Promise.all([listIncidents(), getStats()])
      setIncidents(list)
      setStats(s)
      setDataError('')
    } catch (err) {
      console.error(err)
      setDataError(err.message || 'No se pudieron cargar las incidencias.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    initAuth().then(() => {
      setAuthState(getAuthState())
      refresh()
    })
    const unsub = onAuthChange((state) => {
      setAuthState(state)
    })
    return unsub
  }, [])

  // Filtro por fecha (antigüedad del reporte). Se aplica antes que el de estado
  // y también alimenta el panel de transparencia.
  const dateFiltered = useMemo(() => {
    const days = DATE_RANGES.find((r) => r.key === dateRange)?.days
    if (!days) return incidents
    const cutoff = Date.now() - days * 86400000
    return incidents.filter((i) => new Date(i.createdAt).getTime() >= cutoff)
  }, [incidents, dateRange])

  const visible = useMemo(() => {
    if (filter === 'all') return dateFiltered
    return dateFiltered.filter((i) => i.status === filter)
  }, [dateFiltered, filter])

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
        <span
          className="source-pill"
          title={
            DATA_SOURCE === 'supabase'
              ? 'Conectado a Supabase (base de datos real)'
              : 'Datos locales de demostración (este navegador)'
          }
        >
          {DATA_SOURCE === 'supabase' ? '🟢 Supabase' : '🟡 Demo local'}
        </span>
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
          <button
            className={view === 'dashboard' ? 'viewtab active' : 'viewtab'}
            onClick={() => setView('dashboard')}
          >
            📊 Transparencia
          </button>
          <button
            className={view === 'about' ? 'viewtab active' : 'viewtab'}
            onClick={() => setView('about')}
          >
            ℹ️ Acerca de
          </button>
        </div>
        {authState.user ? (
          <div className="auth-status">
            <span className="auth-email">{authState.user.email}</span>
            {authState.isReviewer && <span className="badge" style={{ background: '#22c55e', marginLeft: 6 }}>
              <span className="dot" />
              Revisor
            </span>}
            <button className="btn btn-sm" onClick={() => setShowAuth(true)} style={{ marginLeft: 8 }}>
              Cerrar sesión
            </button>
          </div>
        ) : (
          <button className="btn btn-sm btn-primary" onClick={() => setShowAuth(true)}>
            🔒 Modo autoridad
          </button>
        )}
      </header>

      {dataError && (
        <div className="warn" style={{ margin: '10px 16px 0' }}>
          {dataError} (revisa tu conexión / credenciales de Supabase)
        </div>
      )}

      {view !== 'about' && (
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
          <div className="stat-spacer" />
          <label className="date-filter" title="Filtrar por antigüedad del reporte">
            🗓️
            <select
              className="date-select"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              {DATE_RANGES.map((r) => (
                <option key={r.key} value={r.key}>{r.label}</option>
              ))}
            </select>
          </label>
        </div>
      )}

      <div className="content">
        {loading ? (
          <div className="list-empty">Cargando incidencias…</div>
        ) : view === 'map' ? (
          <MapView incidents={visible} onSelect={setSelectedId} />
        ) : view === 'list' ? (
          <IncidentList incidents={visible} onSelect={setSelectedId} />
        ) : view === 'dashboard' ? (
          <DashboardView incidents={dateFiltered} onSelect={setSelectedId} />
        ) : (
          <AboutView />
        )}

        {view !== 'about' && (
          <button className="btn btn-primary fab" onClick={() => setShowReport(true)}>
            + Reportar semáforo
          </button>
        )}

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
            isAdmin={authState.isReviewer}
            onClose={() => setSelectedId(null)}
            onChanged={() => refresh()}
          />
        )}

        {showAuth && (
          <AuthModal
            user={authState.user}
            isReviewer={authState.isReviewer}
            onClose={() => setShowAuth(false)}
          />
        )}
      </div>
    </div>
  )
}
