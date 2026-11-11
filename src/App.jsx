import { useEffect, useMemo, useState } from 'react'
import { FiMap, FiList, FiBarChart2, FiInfo, FiLock, FiPlus, FiCalendar, FiEyeOff, FiFilter, FiShield, FiClipboard } from 'react-icons/fi'
import MapView from './components/MapView.jsx'
import IncidentList from './components/IncidentList.jsx'
import DashboardView from './components/DashboardView.jsx'
import ModerationView from './components/ModerationView.jsx'
import ManageView from './components/ManageView.jsx'
import ReportForm from './components/ReportForm.jsx'
import IncidentDetail from './components/IncidentDetail.jsx'
import AuthModal from './components/AuthModal.jsx'
import AboutModal from './components/AboutModal.jsx'
import OnboardingModal, { ONBOARDING_SEEN_KEY } from './components/OnboardingModal.jsx'
import { listIncidents, computeStats, DATA_SOURCE } from './data/store.js'
import { initAuth, onAuthChange, getAuthState } from './data/auth.js'
import { STATUSES, STATUS_ORDER, DATE_RANGES } from './constants.js'
import { getIncidentIdFromUrl } from './shareLink.js'

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

// Casilla para ver también los reportes ocultos por la comunidad (2+ reportes
// de abuso). Por defecto no se muestran, pero cualquiera puede verlos: la
// moderación también es transparente. Solo aparece si hay alguno oculto.
function HiddenToggle({ compact, checked, onChange, count }) {
  if (!count) return null
  return (
    <label className={compact ? 'mf-hidden-toggle' : 'hidden-toggle'} title="Reportes marcados 2 o más veces por la comunidad, en revisión">
      <input type="checkbox" checked={checked} onChange={onChange} />
      Mostrar ocultos por la comunidad ({count})
    </label>
  )
}

export default function App() {
  // Todo lo que entrega el backend: incluye los ocultos por la comunidad y, con
  // sesión de revisor, también los retirados (para la vista Moderación).
  const [incidents, setIncidents] = useState([])
  // Si se entró por un link compartido (?id=...), abre ese reporte apenas cargue.
  const [selectedId, setSelectedId] = useState(() => getIncidentIdFromUrl())
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
  const [showHidden, setShowHidden] = useState(false)
  // 'map' | 'list' | 'dashboard' | solo revisores: 'moderation' | 'manage'
  const [view, setView] = useState('map')
  const [loading, setLoading] = useState(true)
  const [dataError, setDataError] = useState('')
  const [authState, setAuthState] = useState({ user: null, isReviewer: false, loading: true })

  function dismissOnboarding() {
    localStorage.setItem(ONBOARDING_SEEN_KEY, '1')
    setShowOnboarding(false)
  }

  async function refresh() {
    try {
      setIncidents(await listIncidents())
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
    // Al iniciar/cerrar sesión, recarga la lista: con sesión de revisor la BD
    // devuelve también los reportes ocultos y los conteos de reportes al día.
    // (Sin esto, el revisor veía la lista cargada como anónimo hasta recargar.)
    const unsub = onAuthChange((state) => {
      setAuthState(state)
      refresh()
    })
    return unsub
  }, [])

  // Red de seguridad: si el detalle se cierra pero la URL todavía trae ?id=
  // (pasa al entrar directo por un link compartido — ver shareLink.js), la
  // limpia sin agregar una entrada al historial. En el cierre normal
  // (click/atrás dentro de un reporte abierto desde la app) esto no hace
  // nada porque history.back() ya la dejó limpia.
  useEffect(() => {
    if (selectedId) return
    const url = new URL(window.location.href)
    if (url.searchParams.has('id')) {
      url.searchParams.delete('id')
      window.history.replaceState(null, '', url)
    }
  }, [selectedId])

  // Si se cierra la sesión estando en una vista de revisor, vuelve al mapa.
  useEffect(() => {
    if (!authState.isReviewer && (view === 'moderation' || view === 'manage')) setView('map')
  }, [authState.isReviewer, view])

  // Lo que ve el público: nunca los retirados; los ocultos por la comunidad
  // solo si se marcó la casilla.
  const publicIncidents = useMemo(
    () => incidents.filter((i) => !i.removedAt && (showHidden || !i.hidden)),
    [incidents, showHidden]
  )
  const hiddenCount = useMemo(
    () => incidents.filter((i) => !i.removedAt && i.hidden).length,
    [incidents]
  )
  const pendingCount = useMemo(
    () => incidents.filter((i) => !i.removedAt && (i.flags > 0 || i.hidden)).length,
    [incidents]
  )
  // Conteos de la franja de resumen: sobre lo mismo que se ve en mapa/lista.
  const stats = useMemo(() => computeStats(publicIncidents), [publicIncidents])

  // Filtro por fecha (antigüedad del reporte, o un rango a mano con 'custom').
  // Se aplica antes que el de estado y también alimenta el panel de transparencia.
  const dateFiltered = useMemo(() => {
    if (dateRange === 'custom') {
      if (!customStart && !customEnd) return publicIncidents
      const startMs = customStart ? new Date(`${customStart}T00:00:00`).getTime() : -Infinity
      const endMs = customEnd ? new Date(`${customEnd}T23:59:59.999`).getTime() : Infinity
      return publicIncidents.filter((i) => {
        const t = new Date(i.createdAt).getTime()
        return t >= startMs && t <= endMs
      })
    }
    const days = DATE_RANGES.find((r) => r.key === dateRange)?.days
    if (!days) return publicIncidents
    const cutoff = Date.now() - days * 86400000
    return publicIncidents.filter((i) => new Date(i.createdAt).getTime() >= cutoff)
  }, [publicIncidents, dateRange, customStart, customEnd])

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
        {/* Vistas solo para revisores (un solo rol por ahora: modera y gestiona). */}
        {authState.isReviewer && (
          <div className="viewtabs staff-tabs">
            <button
              className={view === 'moderation' ? 'viewtab active' : 'viewtab'}
              onClick={() => setView('moderation')}
            >
              <FiShield /> Moderación
              {pendingCount > 0 && <span className="tab-count">{pendingCount}</span>}
            </button>
            <button
              className={view === 'manage' ? 'viewtab active' : 'viewtab'}
              onClick={() => setView('manage')}
            >
              <FiClipboard /> Gestión
            </button>
          </div>
        )}
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
          <HiddenToggle
            checked={showHidden}
            onChange={(e) => setShowHidden(e.target.checked)}
            count={hiddenCount}
          />
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
          <HiddenToggle
            checked={showHidden}
            onChange={(e) => setShowHidden(e.target.checked)}
            count={hiddenCount}
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
        ) : view === 'moderation' ? (
          <ModerationView incidents={incidents} onSelect={setSelectedId} onChanged={refresh} />
        ) : view === 'manage' ? (
          <ManageView incidents={incidents} onSelect={setSelectedId} onChanged={refresh} />
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
            <HiddenToggle
              compact
              checked={showHidden}
              onChange={(e) => setShowHidden(e.target.checked)}
              count={hiddenCount}
            />
          </div>
        ))}

        {/* En las vistas de revisor el botón flotante tapaba las acciones de
            la última tarjeta, y ahí no se usa para reportar. */}
        {view !== 'moderation' && view !== 'manage' && (
          <button className="btn btn-primary fab" onClick={() => setShowReport(true)}>
            <FiPlus /> Reportar semáforo
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
