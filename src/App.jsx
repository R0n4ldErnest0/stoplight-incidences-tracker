import { useEffect, useMemo, useState } from 'react'
import { FiMap, FiList, FiBarChart2, FiInfo, FiLock, FiPlus, FiCalendar, FiEyeOff, FiFilter } from 'react-icons/fi'
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

function fmtShortDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' })
}

// Etiqueta corta del rango de fecha activo, para la píldora colapsada del
// resumen flotante (mobile). null cuando el rango es 'all' (nada que mostrar).
function activeDateLabel(dateRange, customStart, customEnd) {
  if (dateRange === 'all') return null
  if (dateRange === 'custom') {
    if (!customStart && !customEnd) return null
    return `${customStart ? fmtShortDate(customStart) : '…'}–${customEnd ? fmtShortDate(customEnd) : '…'}`
  }
  return DATE_RANGES.find((r) => r.key === dateRange)?.label
}

// Selector de rango de fecha, reutilizado en la franja de escritorio, las
// barras de Lista/Transparencia y el resumen flotante (mobile, `compact`).
function DateRangeSelect({ compact, value, onChange, customStart, customEnd, onCustomStart, onCustomEnd }) {
  return (
    <label className={compact ? 'mf-daterow' : 'date-filter'} title="Filtrar por antigüedad del reporte">
      <FiCalendar />
      <select
        className={compact ? 'mf-date-select' : 'date-select'}
        value={value}
        onChange={onChange}
      >
        {DATE_RANGES.map((r) => (
          <option key={r.key} value={r.key}>{r.label}</option>
        ))}
      </select>
      {value === 'custom' && (
        <span className={compact ? 'mf-custom-dates' : 'custom-dates'}>
          <input
            type="date"
            className={compact ? 'mf-date-input' : 'date-select'}
            value={customStart}
            max={customEnd || undefined}
            onChange={onCustomStart}
            aria-label="Desde"
          />
          <span className="custom-dates-sep">–</span>
          <input
            type="date"
            className={compact ? 'mf-date-input' : 'date-select'}
            value={customEnd}
            min={customStart || undefined}
            onChange={onCustomEnd}
            aria-label="Hasta"
          />
        </span>
      )}
    </label>
  )
}

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
  // Solo se usan cuando dateRange === 'custom' (strings 'YYYY-MM-DD' de <input type="date">).
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  // Resumen flotante (mobile, vista mapa): el usuario puede ocultarlo; al
  // ocultarlo se reemplaza por una píldora chiquita con el filtro activo.
  const [statsHidden, setStatsHidden] = useState(false)
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

  // Filtro por fecha (antigüedad del reporte, o un rango a mano con 'custom').
  // Se aplica antes que el de estado y también alimenta el panel de transparencia.
  const dateFiltered = useMemo(() => {
    if (dateRange === 'custom') {
      if (!customStart && !customEnd) return incidents
      const startMs = customStart ? new Date(`${customStart}T00:00:00`).getTime() : -Infinity
      const endMs = customEnd ? new Date(`${customEnd}T23:59:59.999`).getTime() : Infinity
      return incidents.filter((i) => {
        const t = new Date(i.createdAt).getTime()
        return t >= startMs && t <= endMs
      })
    }
    const days = DATE_RANGES.find((r) => r.key === dateRange)?.days
    if (!days) return incidents
    const cutoff = Date.now() - days * 86400000
    return incidents.filter((i) => new Date(i.createdAt).getTime() >= cutoff)
  }, [incidents, dateRange, customStart, customEnd])

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
      {view === 'map' && (
        <div className="stats stats-mapview">
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
          <DateRangeSelect
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            customStart={customStart}
            customEnd={customEnd}
            onCustomStart={(e) => setCustomStart(e.target.value)}
            onCustomEnd={(e) => setCustomEnd(e.target.value)}
          />
        </div>
      )}

      {/* Lista: los botones de estado se envolvían en varias filas en mobile
          (ver docs_references) — un desplegable es compacto en cualquier ancho. */}
      {view === 'list' && (
        <div className="stats">
          <label className="date-filter" title="Filtrar por estado">
            <FiFilter />
            <select
              className="date-select"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">Total ({stats.total})</option>
              {STATUS_ORDER.map((key) => (
                <option key={key} value={key}>
                  {STATUSES[key].label} ({stats.byStatus[key] || 0})
                </option>
              ))}
            </select>
          </label>
          <DateRangeSelect
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            customStart={customStart}
            customEnd={customEnd}
            onCustomStart={(e) => setCustomStart(e.target.value)}
            onCustomEnd={(e) => setCustomEnd(e.target.value)}
          />
        </div>
      )}

      {/* Transparencia: el filtro de estado no tenía efecto acá (el panel usa
          dateFiltered, no visible/filter) — se quitó para no confundir. Solo
          el rango de fecha sí cambia lo que se muestra. */}
      {view === 'dashboard' && (
        <div className="stats">
          <DateRangeSelect
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            customStart={customStart}
            customEnd={customEnd}
            onCustomStart={(e) => setCustomStart(e.target.value)}
            onCustomEnd={(e) => setCustomEnd(e.target.value)}
          />
        </div>
      )}

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
            franja normal ya alcanza y esto queda oculto. Semitransparente
            hasta que el usuario pasa el cursor o toca (ver :hover/:focus-within
            en CSS); el usuario también puede ocultarlo del todo con el ícono. */}
        {view === 'map' && (statsHidden ? (
          <button
            className="map-stats-pill"
            onClick={() => setStatsHidden(false)}
            title="Mostrar resumen"
          >
            <span
              className="mf-dot"
              style={{ background: filter === 'all' ? 'var(--accent)' : STATUSES[filter].color }}
            />
            <span className="mf-num">{filter === 'all' ? stats.total : (stats.byStatus[filter] || 0)}</span>
            <span className="mf-label">{filter === 'all' ? 'Total' : STATUSES[filter].label}</span>
            {activeDateLabel(dateRange, customStart, customEnd) && (
              <>
                <span className="mf-pill-sep">·</span>
                <span className="mf-label">{activeDateLabel(dateRange, customStart, customEnd)}</span>
              </>
            )}
          </button>
        ) : (
          <div className="map-stats-float">
            <button
              className="mf-hide-btn"
              onClick={() => setStatsHidden(true)}
              title="Ocultar resumen"
              aria-label="Ocultar resumen"
            >
              <FiEyeOff />
            </button>
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
                <span className="mf-label">{STATUSES[key].label}</span>
              </button>
            ))}
            <div className="mf-div" />
            <DateRangeSelect
              compact
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              customStart={customStart}
              customEnd={customEnd}
              onCustomStart={(e) => setCustomStart(e.target.value)}
              onCustomEnd={(e) => setCustomEnd(e.target.value)}
            />
          </div>
        ))}

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
