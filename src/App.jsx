import { useEffect, useMemo, useState } from 'react'
import { FiMap, FiList, FiBarChart2, FiInfo, FiLock, FiPlus, FiCalendar } from 'react-icons/fi'
import MapView from './components/MapView.jsx'
import IncidentList from './components/IncidentList.jsx'
import DashboardView from './components/DashboardView.jsx'
import ReportForm from './components/ReportForm.jsx'
import IncidentDetail from './components/IncidentDetail.jsx'
import AuthModal from './components/AuthModal.jsx'
import AboutModal from './components/AboutModal.jsx'
import OnboardingModal, { ONBOARDING_SEEN_KEY } from './components/OnboardingModal.jsx'
import { listIncidents, getStats, DATA_SOURCE } from './data/store.js'
import { initAuth, onAuthChange, getAuthState } from './data/auth.js'
import { STATUSES, STATUS_ORDER, DATE_RANGES } from './constants.js'

const EMPTY_STATS = { total: 0, byStatus: {}, avgDays: null }

// Etiquetas recortadas solo para el resumen flotante (mobile, vista mapa),
// donde el espacio es angosto. En todo lo demás se usa STATUSES[key].label.
const SHORT_LABEL = { in_progress: 'En rep.' }

export default function App() {
  const [incidents, setIncidents] = useState([])
  const [stats, setStats] = useState(EMPTY_STATS)
  const [selectedId, setSelectedId] = useState(null)
  const [showReport, setShowReport] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(
    () => !localStorage.getItem(ONBOARDING_SEEN_KEY)
  )
  const [filter, setFilter] = useState('all')
  const [dateRange, setDateRange] = useState('all')
  const [view, setView] = useState('map') // 'map' | 'list' | 'dashboard'
  const [loading, setLoading] = useState(true)
  const [dataError, setDataError] = useState('')
  const [authState, setAuthState] = useState({ user: null, isReviewer: false, loading: true })

  function dismissOnboarding() {
    localStorage.setItem(ONBOARDING_SEEN_KEY, '1')
    setShowOnboarding(false)
  }

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
        {/* En modo real no mostramos detalles de infraestructura al ciudadano;
            solo señalamos cuando son datos de demostración (no compartidos). */}
        {DATA_SOURCE !== 'supabase' && (
          <span
            className="source-pill"
            title="Datos de demostración en este navegador — no se comparten ni son reales"
          >
            🟡 Demo
          </span>
        )}
        <div className="spacer" />
        <div className="viewtabs">
          <button
            className={view === 'map' ? 'viewtab active' : 'viewtab'}
            onClick={() => setView('map')}
          >
            <FiMap /> Mapa
          </button>
          <button
            className={view === 'list' ? 'viewtab active' : 'viewtab'}
            onClick={() => setView('list')}
          >
            <FiList /> Lista
          </button>
          <button
            className={view === 'dashboard' ? 'viewtab active' : 'viewtab'}
            onClick={() => setView('dashboard')}
          >
            <FiBarChart2 /> Transparencia
          </button>
        </div>
        <button
          className="icon-btn about-trigger"
          onClick={() => setShowAbout(true)}
          title="Acerca de SemáforoAlerta"
          aria-label="Acerca de"
        >
          <FiInfo />
        </button>
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
            <FiLock /> Modo autoridad
          </button>
        )}
      </header>

      {dataError && (
        <div className="warn" style={{ margin: '10px 16px 0' }}>
          {dataError} (revisa tu conexión / credenciales de Supabase)
        </div>
      )}

      {/* En mapa + mobile, esta franja se envuelve en 2-3 filas y empuja el
          mapa hacia abajo, así que ahí se oculta (ver .stats-mapview) y el
          resumen flota sobre el mapa en su lugar (.map-stats-float, abajo). */}
      <div className={view === 'map' ? 'stats stats-mapview' : 'stats'}>
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
            <FiCalendar />
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

      <div className="content">
        {loading ? (
          <div className="list-empty">Cargando incidencias…</div>
        ) : view === 'map' ? (
          <MapView incidents={visible} onSelect={setSelectedId} />
        ) : view === 'list' ? (
          <IncidentList incidents={visible} onSelect={setSelectedId} />
        ) : (
          <DashboardView incidents={dateFiltered} onSelect={setSelectedId} />
        )}

        {/* Solo visible por CSS bajo el ancho donde la franja de arriba se
            envolvería (ver .map-stats-float en styles.css); en escritorio la
            franja normal ya alcanza y esto queda oculto. */}
        {view === 'map' && (
          <div className="map-stats-float">
            <button
              className="mf-chip"
              style={{ outlineColor: filter === 'all' ? 'var(--accent)' : 'transparent' }}
              onClick={() => setFilter('all')}
            >
              <span className="mf-num">{stats.total}</span>
              <span className="mf-label">Total</span>
            </button>
            <div className="mf-div" />
            {STATUS_ORDER.map((key) => (
              <button
                key={key}
                className="mf-chip"
                style={{ outlineColor: filter === key ? STATUSES[key].color : 'transparent' }}
                onClick={() => setFilter(key)}
              >
                <span className="mf-dot" style={{ background: STATUSES[key].color }} />
                <span className="mf-num">{stats.byStatus[key] || 0}</span>
                <span className="mf-label">{SHORT_LABEL[key] || STATUSES[key].label}</span>
              </button>
            ))}
          </div>
        )}

        <button className="btn btn-primary fab" onClick={() => setShowReport(true)}>
          <FiPlus /> Reportar semáforo
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

        {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}

        {showOnboarding && (
          <OnboardingModal
            onClose={dismissOnboarding}
            onMoreInfo={() => {
              dismissOnboarding()
              setShowAbout(true)
            }}
          />
        )}
      </div>
    </div>
  )
}
