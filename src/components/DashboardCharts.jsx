import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet'
import { LIMA_CENTER, DEFAULT_ZOOM } from '../constants.js'

// Gráficos del panel de transparencia, en SVG simple (sin librerías).
// Colores validados con el validador de paletas (daltonismo + contraste
// sobre fondo blanco): ver CHART_COLORS / AGE_RAMP.
const CHART_COLORS = {
  created: '#2a78d6', // azul — reportes nuevos
  resolved: '#eb6834', // naranja — reportes resueltos
}
// Rampa ordinal de un solo tono (más oscuro = más antiguo).
const AGE_RAMP = ['#86b6ef', '#5598e7', '#2a78d6', '#1c5cab']
const BUBBLE = '#2a78d6'
const INK = { text: '#0f1c30', muted: '#4a5b73', grid: '#e1e6ee', axis: '#c3d0e0' }

// Ancho real del contenedor, para dibujar el SVG a tamaño de pantalla (así
// el texto no se encoge en el celular como pasaría con un viewBox fijo).
function useWidth() {
  const ref = useRef(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, width]
}

// Máximo "redondo" para el eje Y y sus marcas (enteros: son conteos).
function niceScale(max) {
  if (max <= 4) return { top: 4, ticks: [0, 1, 2, 3, 4] }
  const rough = max / 4
  const pow = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= rough)
  const top = Math.ceil(max / step) * step
  const ticks = []
  for (let v = 0; v <= top; v += step) ticks.push(v)
  return { top, ticks }
}

function monthLabel(date, withYear) {
  const m = date.toLocaleDateString('es-PE', { month: 'short' }).replace('.', '')
  return withYear ? `${m} ${String(date.getFullYear()).slice(2)}` : m
}

// ---------------------------------------------------------------------------
// 1) Evolución mensual: nuevos vs resueltos (dos líneas, un solo eje).
// ---------------------------------------------------------------------------
export function TrendChart({ months }) {
  const [ref, width] = useWidth()
  const [hover, setHover] = useState(null)
  const H = 220
  const M = { top: 14, right: 16, bottom: 28, left: 34 }
  const innerW = Math.max(width - M.left - M.right, 10)
  const innerH = H - M.top - M.bottom

  const maxVal = Math.max(1, ...months.map((m) => Math.max(m.created, m.resolved)))
  const { top, ticks } = niceScale(maxVal)
  const n = months.length
  const x = (i) => M.left + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW)
  const y = (v) => M.top + innerH - (v / top) * innerH
  const path = (k) => months.map((m, i) => `${i ? 'L' : 'M'}${x(i)},${y(m[k])}`).join(' ')
  // Etiquetas del eje X: todas si caben, si no una de cada dos.
  const every = innerW / Math.max(n, 1) < 44 ? 2 : 1

  function pick(clientX) {
    const rect = ref.current.getBoundingClientRect()
    const px = clientX - rect.left
    let best = 0
    for (let i = 1; i < n; i++) if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i
    setHover(best)
  }
  function onKey(e) {
    if (e.key === 'ArrowRight') setHover((h) => Math.min((h ?? -1) + 1, n - 1))
    else if (e.key === 'ArrowLeft') setHover((h) => Math.max((h ?? n) - 1, 0))
    else if (e.key === 'Escape') setHover(null)
  }

  const last = months[n - 1]
  const hm = hover != null ? months[hover] : null

  return (
    <figure className="chart">
      <div className="chart-legend" aria-hidden="true">
        <span><i className="key-line" style={{ background: CHART_COLORS.created }} /> Nuevos</span>
        <span><i className="key-line" style={{ background: CHART_COLORS.resolved }} /> Resueltos</span>
      </div>
      <div className="chart-plot" ref={ref}>
        {width > 0 && (
          <svg
            width={width}
            height={H}
            role="img"
            aria-label={`Reportes nuevos y resueltos por mes. Último mes: ${last.created} nuevos, ${last.resolved} resueltos.`}
            tabIndex={0}
            // En el celular no hay "pasar el cursor": un toque elige el mes y
            // la lectura queda visible hasta tocar otro punto o salir.
            onPointerMove={(e) => pick(e.clientX)}
            onPointerDown={(e) => pick(e.clientX)}
            onPointerLeave={(e) => { if (e.pointerType === 'mouse') setHover(null) }}
            onKeyDown={onKey}
            onBlur={() => setHover(null)}
          >
            {ticks.map((t) => (
              <g key={t}>
                <line x1={M.left} x2={M.left + innerW} y1={y(t)} y2={y(t)}
                  stroke={t === 0 ? INK.axis : INK.grid} strokeWidth="1" />
                <text x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="chart-tick">{t}</text>
              </g>
            ))}
            {months.map((m, i) =>
              i % every === 0 || i === n - 1 ? (
                <text key={m.key} x={x(i)} y={H - 8} textAnchor="middle" className="chart-tick">
                  {monthLabel(m.date, i === 0 || m.date.getMonth() === 0)}
                </text>
              ) : null
            )}
            {hm && (
              <line x1={x(hover)} x2={x(hover)} y1={M.top} y2={M.top + innerH}
                stroke={INK.axis} strokeWidth="1" />
            )}
            {['created', 'resolved'].map((k) => (
              <path key={k} d={path(k)} fill="none" stroke={CHART_COLORS[k]}
                strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            ))}
            {/* Puntos: el último mes siempre; el mes bajo el cursor al pasar. */}
            {['created', 'resolved'].map((k) => {
              const i = hover ?? n - 1
              return (
                <circle key={k} cx={x(i)} cy={y(months[i][k])} r="4.5"
                  fill={CHART_COLORS[k]} stroke="#fff" strokeWidth="2" />
              )
            })}
          </svg>
        )}
        {hm && (
          <div
            className="chart-tip"
            style={{ left: Math.min(Math.max(x(hover) - 70, 0), Math.max(width - 140, 0)) }}
            role="status"
          >
            <div className="chart-tip-title">{monthLabel(hm.date, true)}</div>
            <div><i className="key-line" style={{ background: CHART_COLORS.created }} /><b>{hm.created}</b> nuevos</div>
            <div><i className="key-line" style={{ background: CHART_COLORS.resolved }} /><b>{hm.resolved}</b> resueltos</div>
          </div>
        )}
      </div>
      <details className="chart-table">
        <summary>Ver datos en tabla</summary>
        <table>
          <thead><tr><th>Mes</th><th>Nuevos</th><th>Resueltos</th></tr></thead>
          <tbody>
            {months.map((m) => (
              <tr key={m.key}><td>{monthLabel(m.date, true)}</td><td>{m.created}</td><td>{m.resolved}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}

// ---------------------------------------------------------------------------
// 2) Antigüedad de los pendientes: columnas por tramo de días.
// ---------------------------------------------------------------------------
export function AgeHistogram({ bands }) {
  const [ref, width] = useWidth()
  const [hover, setHover] = useState(null)
  const H = 190
  const M = { top: 22, right: 8, bottom: 30, left: 8 }
  const innerW = Math.max(width - M.left - M.right, 10)
  const innerH = H - M.top - M.bottom
  const band = innerW / bands.length
  const barW = Math.min(24, band * 0.6)
  const max = Math.max(1, ...bands.map((b) => b.count))
  const base = M.top + innerH

  // Columna con extremo de datos redondeado (4px) y base recta.
  function colPath(cx, h) {
    const x0 = cx - barW / 2
    const r = Math.min(4, h)
    const y0 = base - h
    return `M${x0},${base} V${y0 + r} Q${x0},${y0} ${x0 + r},${y0} H${x0 + barW - r} Q${x0 + barW},${y0} ${x0 + barW},${y0 + r} V${base} Z`
  }

  return (
    <figure className="chart">
      <div className="chart-plot" ref={ref}>
        {width > 0 && (
          <svg width={width} height={H} role="img"
            aria-label={bands.map((b) => `${b.label}: ${b.count}`).join(', ')}>
            <line x1={M.left} x2={M.left + innerW} y1={base} y2={base} stroke={INK.axis} strokeWidth="1" />
            {bands.map((b, i) => {
              const cx = M.left + band * i + band / 2
              const h = b.count ? Math.max((b.count / max) * innerH, 3) : 0
              return (
                <g key={b.key}
                  onPointerEnter={() => setHover(i)}
                  onPointerDown={() => setHover(i)}
                  onPointerLeave={(e) => { if (e.pointerType === 'mouse') setHover(null) }}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  tabIndex={0}
                  aria-label={`${b.label}: ${b.count} reporte(s)`}
                >
                  {/* Zona sensible = toda la franja, no solo la columna. */}
                  <rect x={M.left + band * i} y={M.top} width={band} height={innerH} fill="transparent" />
                  {h > 0 && (
                    <path d={colPath(cx, h)} fill={AGE_RAMP[i]} opacity={hover == null || hover === i ? 1 : 0.55} />
                  )}
                  <text x={cx} y={base - h - 6} textAnchor="middle" className="chart-value">{b.count}</text>
                  <text x={cx} y={H - 10} textAnchor="middle" className="chart-tick">{b.label}</text>
                </g>
              )
            })}
          </svg>
        )}
        {hover != null && (
          <div className="chart-tip" role="status"
            // Al costado de la columna (no encima, para no tapar su valor);
            // a la izquierda si a la derecha no hay espacio.
            style={(() => {
              const cx = M.left + band * hover + band / 2
              return cx + barW / 2 + 8 + 150 <= width
                ? { left: cx + barW / 2 + 8 }
                : { right: width - (cx - barW / 2 - 8) }
            })()}>
            <div className="chart-tip-title">{bands[hover].label}</div>
            <div><b>{bands[hover].count}</b> pendiente(s) · {Math.round(bands[hover].share * 100)}%</div>
          </div>
        )}
      </div>
    </figure>
  )
}

// ---------------------------------------------------------------------------
// 3) Mapa por distrito: una burbuja por distrito, tamaño = pendientes.
// ---------------------------------------------------------------------------
function FitToBubbles({ points }) {
  const map = useMap()
  useEffect(() => {
    if (points.length === 1) map.setView(points[0], 13)
    else if (points.length > 1) map.fitBounds(points, { padding: [36, 36], maxZoom: 14 })
  }, [map, points])
  return null
}

export function DistrictBubbleMap({ districts }) {
  const withPending = useMemo(
    () => districts.filter((d) => d.active > 0 && d.lat != null),
    [districts]
  )
  const points = useMemo(() => withPending.map((d) => [d.lat, d.lng]), [withPending])
  // En pantallas táctiles, arrastrar el mapa atraparía el scroll de la página.
  const touch = typeof window !== 'undefined' && 'ontouchstart' in window

  if (!withPending.length) {
    return <p className="dash-sub">No hay reportes pendientes en ningún distrito. 🎉</p>
  }

  return (
    <figure className="chart">
      <div className="bubble-map">
        <MapContainer center={LIMA_CENTER} zoom={DEFAULT_ZOOM} scrollWheelZoom={false} dragging={!touch}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitToBubbles points={points} />
          {/* Los más grandes primero, para que los chicos queden encima. */}
          {[...withPending].sort((a, b) => b.active - a.active).map((d) => (
            <CircleMarker
              key={d.district}
              center={[d.lat, d.lng]}
              // Tamaño según el conteo real (radio ∝ raíz cuadrada, así el área
              // crece con el número), no relativo al mayor: 1 pendiente se ve
              // chico aunque sea el único distrito.
              radius={Math.min(30, 6 + 6 * Math.sqrt(d.active))}
              pathOptions={{ color: '#ffffff', weight: 2, fillColor: BUBBLE, fillOpacity: 0.6 }}
            >
              <Tooltip direction="top">
                <b>{d.district}</b>
                <br />
                {d.active} sin resolver · {d.total} en total
                {d.avgDays != null && <><br />{d.avgDays} días prom. a resolver</>}
              </Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
      <figcaption className="chart-caption">
        El tamaño de cada círculo indica cuántos reportes siguen sin resolver en el
        distrito. Pasa el cursor (o toca) un círculo para ver el detalle; la tabla de
        abajo tiene todos los números.
      </figcaption>
    </figure>
  )
}
