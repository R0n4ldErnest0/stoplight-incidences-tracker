import { useId, useMemo, useState } from 'react'
import { FiClock, FiHelpCircle } from 'react-icons/fi'
import { computeDashboard, computeMonthlyTrend, computeAgeBands, ageDays } from '../data/helpers.js'
import { TrendChart, AgeHistogram, DistrictBubbleMap } from './DashboardCharts.jsx'
import { STATUSES, STATUS_ORDER, FAULT_TYPES } from '../constants.js'
import StatusBadge from './StatusBadge.jsx'

function faultLabel(key) {
  return FAULT_TYPES.find((f) => f.key === key)?.label || key
}

// Botón "?" que despliega cómo se calcula una cifra (transparencia también
// sobre el método). Se despliega en línea, debajo — sin popovers que se
// salgan de la pantalla en el celular.
function useHelp() {
  const [open, setOpen] = useState(false)
  const id = useId()
  const button = (label) => (
    <button
      type="button"
      className={open ? 'help-btn open' : 'help-btn'}
      onClick={() => setOpen((o) => !o)}
      aria-expanded={open}
      aria-controls={id}
      aria-label={`¿Cómo se calcula ${label}?`}
      title="¿Cómo se calcula?"
    >
      <FiHelpCircle />
    </button>
  )
  const box = (content) =>
    open && (
      <div id={id} className="how-box" role="note">
        {content}
      </div>
    )
  return [button, box]
}

// Tarjeta de métrica grande, con su explicación.
function Metric({ value, label, sub, color, help }) {
  const [button, box] = useHelp()
  return (
    <div className="metric">
      <div className="metric-top">
        <div className="metric-value" style={color ? { color } : undefined}>{value}</div>
        {help && button(label.toLowerCase())}
      </div>
      <div className="metric-label">{label}</div>
      {sub && <div className="metric-sub">{sub}</div>}
      {help && box(help)}
    </div>
  )
}

// Título de sección con su explicación.
function Section({ title, icon, help, children }) {
  const [button, box] = useHelp()
  return (
    <>
      <div className="dash-section-row">
        <h4 className="dash-section">{icon}{title}</h4>
        {button(`"${title}"`)}
      </div>
      {box(help)}
      {children}
    </>
  )
}

export default function DashboardView({ incidents, onSelect }) {
  const d = useMemo(() => computeDashboard(incidents), [incidents])
  const months = useMemo(() => computeMonthlyTrend(incidents), [incidents])
  const ageBands = useMemo(() => computeAgeBands(incidents), [incidents])
  const [aboutButton, aboutBox] = useHelp()

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
        <div className="dash-section-row">
          <h3 className="dash-h">Panel de transparencia</h3>
          {aboutButton('estas cifras')}
        </div>
        <p className="dash-sub">
          Visibilidad pública del estado de los semáforos reportados y de la respuesta de la autoridad.
          Toca <FiHelpCircle className="inline-icon" aria-label="el ícono de ayuda" /> para ver cómo se calcula cada cifra.
        </p>
        {aboutBox(
          <>
            <p>
              Todas las cifras se calculan en tu navegador a partir de los mismos reportes que ves
              en el mapa, filtrados por el rango de fechas elegido arriba (según la fecha en que se
              creó cada reporte).
            </p>
            <p>
              No se cuentan los reportes retirados por moderación. Los ocultos por la comunidad
              solo se cuentan si activaste «Mostrar ocultos por la comunidad» en Mapa o Lista.
            </p>
            <p>
              Los reportes los crea la ciudadanía y los estados los actualiza la autoridad; cada
              cambio queda registrado con su fecha en el historial público de cada reporte.
            </p>
          </>
        )}

        {/* Métricas principales */}
        <div className="metrics">
          <Metric
            value={d.total}
            label="Reportes totales"
            help="Reportes creados dentro del rango de fechas, en cualquier estado (incluye los marcados como duplicados)."
          />
          <Metric
            value={d.active}
            label="Sin resolver"
            color="#ef4444"
            help="Reportes cuyo estado actual es Reportado, Revisado o En reparación."
          />
          <Metric
            value={d.resolved}
            label="Resueltos"
            color="#22c55e"
            help="Reportes cuyo estado actual es Resuelto."
          />
          <Metric
            value={`${d.resolutionRate}%`}
            label="Tasa de resolución"
            help={`Resueltos ÷ reportes totales × 100, redondeado: ${d.resolved} ÷ ${d.total} × 100 = ${d.resolutionRate}%.`}
          />
          <Metric
            value={`${d.responseRate}%`}
            label="Tasa de respuesta"
            sub="salieron de 'reportado'"
            help={`Reportes que la autoridad ya atendió de alguna forma (pasaron a Revisado, En reparación o Resuelto) ÷ reportes totales × 100: ${d.responded} ÷ ${d.total} × 100 = ${d.responseRate}%. Los duplicados no cuentan como respuesta.`}
          />
          <Metric
            value={d.avgDays != null ? `${d.avgDays}` : '—'}
            label="Días prom. a resolver"
            sub={d.avgDays == null ? 'sin datos aún' : undefined}
            help={
              d.avgDays == null
                ? 'Aparecerá cuando haya reportes resueltos: es el promedio de días entre que se crea un reporte y se marca como Resuelto.'
                : `Para cada reporte resuelto se cuentan los días entre su creación y la fecha en que se marcó como Resuelto (según su historial). Es el promedio de ${d.resolvedWithTime} reporte(s) resuelto(s), redondeado.`
            }
          />
        </div>

        {/* ¿La autoridad sigue el ritmo? */}
        <Section
          title="Evolución mensual"
          help={
            <>
              <p><b>Nuevos:</b> reportes creados en ese mes.</p>
              <p>
                <b>Resueltos:</b> reportes marcados como Resuelto en ese mes (según la fecha de su
                historial), aunque se hayan creado antes.
              </p>
              <p>
                Si mes a mes los resueltos quedan por debajo de los nuevos, los pendientes se
                acumulan. Se muestran como máximo los últimos 12 meses.
              </p>
            </>
          }
        >
          <p className="dash-sub dash-sub-tight">Reportes nuevos frente a reportes resueltos cada mes.</p>
          <TrendChart months={months} />
        </Section>

        {/* Reparto por estado */}
        <Section
          title="Por estado"
          help="Cuántos reportes hay ahora mismo en cada estado. Cada reporte cuenta una sola vez, en su estado actual. Los duplicados no se muestran aquí."
        >
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
        </Section>

        {/* Cuánto llevan esperando los pendientes */}
        <Section
          title="¿Cuánto llevan esperando?"
          help="Solo reportes sin resolver (Reportado, Revisado o En reparación). La antigüedad son los días desde que se creó el reporte hasta hoy, no desde su última actualización: un reporte creado hace 100 días que ya está En reparación cuenta en «Más de 90 días»."
        >
          <p className="dash-sub dash-sub-tight">Reportes sin resolver según su antigüedad.</p>
          <AgeHistogram bands={ageBands} />
        </Section>

        {/* Semáforos más antiguos sin resolver — el ángulo de rendición de cuentas */}
        <Section
          title="Más antiguos sin resolver"
          icon={<FiClock />}
          help="Los 6 reportes sin resolver con la fecha de creación más antigua. Los que llevan más de 90 días se marcan en rojo."
        >
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
        </Section>

        {/* Desglose por distrito: mapa de burbujas + tabla con los números */}
        <Section
          title="Por distrito"
          help={
            <>
              <p>
                Los reportes se agrupan por el distrito indicado en cada uno (lo elige quien reporta
                o se completa con la ubicación GPS).
              </p>
              <p>
                <b>Mapa:</b> cada círculo se ubica en el punto promedio de los reportes pendientes
                del distrito, y su tamaño crece con cuántos siguen sin resolver.
              </p>
              <p>
                <b>Tabla:</b> Total = todos los reportes del distrito; Sin resolver y Resueltos =
                según su estado actual; Días prom. = promedio de días a resolver de sus reportes
                resueltos.
              </p>
            </>
          }
        >
          <DistrictBubbleMap districts={d.byDistrict} />
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
        </Section>

        {/* Tipos de falla: histograma para ver de un vistazo cuáles se repiten más. */}
        <Section
          title="Tipos de falla"
          help="Cuántos reportes hay de cada tipo de falla, según lo que eligió quien reportó. Incluye reportes en cualquier estado."
        >
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
        </Section>
      </div>
    </div>
  )
}
