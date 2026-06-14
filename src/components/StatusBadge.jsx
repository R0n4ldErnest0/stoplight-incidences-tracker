import { STATUSES } from '../constants.js'

export default function StatusBadge({ status }) {
  const s = STATUSES[status] || STATUSES.reported
  return (
    <span className="badge" style={{ background: s.color }}>
      <span className="dot" />
      {s.label}
    </span>
  )
}
