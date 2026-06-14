import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { LIMA_CENTER, DEFAULT_ZOOM, STATUSES } from '../constants.js'
import StatusBadge from './StatusBadge.jsx'
import { ageDays } from '../data/store.js'

// Pin de color según estado (divIcon evita problemas de assets de Leaflet).
function pinIcon(status) {
  const color = (STATUSES[status] || STATUSES.reported).color
  return L.divIcon({
    className: '',
    html: `<div class="pin" style="background:${color}"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 18],
    popupAnchor: [0, -18],
  })
}

export default function MapView({ incidents, onSelect }) {
  return (
    <div className="map-wrap">
      <MapContainer center={LIMA_CENTER} zoom={DEFAULT_ZOOM} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {incidents.map((inc) => (
          <Marker
            key={inc.id}
            position={[inc.lat, inc.lng]}
            icon={pinIcon(inc.status)}
          >
            <Popup>
              <div style={{ minWidth: 180 }}>
                <strong>{inc.title}</strong>
                <div style={{ margin: '6px 0' }}>
                  <StatusBadge status={inc.status} />
                </div>
                <div style={{ fontSize: 12, color: '#475569' }}>
                  {inc.district} · hace {ageDays(inc)} días
                </div>
                <button
                  className="btn btn-sm btn-primary"
                  style={{ marginTop: 8 }}
                  onClick={() => onSelect(inc.id)}
                >
                  Ver detalle
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
