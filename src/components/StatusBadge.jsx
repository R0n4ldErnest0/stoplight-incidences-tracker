import { STATUSES } from '../constants.js'

export default function StatusBadge({ status }) {
  const s = STATUSES[status] || STATUSES.reported
  // Tinte claro del color del estado + punto de color + texto oscuro del
  // mismo tono: el estado se lee igual, sin píldoras sólidas que griten.
  return (
    <span
      className="badge"
      style={{
        background: `color-mix(in srgb, ${s.color} 14%, #fff)`,
        color: `color-mix(in srgb, ${s.color} 45%, #0f1c30)`,
      }}
    >
      <span className="dot" style={{ background: s.color }} />
      {s.label}
    </span>
  )
}
