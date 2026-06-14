import { useState, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import { LIMA_CENTER, FAULT_TYPES, DISTRICTS } from '../constants.js'
import { createIncident, findNearby } from '../data/store.js'

const pickIcon = L.divIcon({
  className: '',
  html: '<div class="pin" style="background:#38bdf8"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 18],
})

// Captura clics en el mini-mapa para fijar la ubicación.
function ClickToPlace({ pos, setPos }) {
  useMapEvents({
    click(e) {
      setPos({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  return pos ? <Marker position={[pos.lat, pos.lng]} icon={pickIcon} /> : null
}

// Permite recentrar el mapa de forma imperativa (al usar geolocalización).
function Recenter({ pos }) {
  const map = useMap()
  if (pos) map.setView([pos.lat, pos.lng], 16)
  return null
}

export default function ReportForm({ onClose, onCreated }) {
  const [pos, setPos] = useState(null)
  const [photo, setPhoto] = useState(null)
  const [title, setTitle] = useState('')
  const [faultType, setFaultType] = useState(FAULT_TYPES[0].key)
  const [district, setDistrict] = useState(DISTRICTS[0])
  const [description, setDescription] = useState('')
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  const nearby = pos ? findNearby(pos, 60) : []

  function useMyLocation() {
    setError('')
    if (!navigator.geolocation) {
      setError('Tu navegador no permite geolocalización. Marca el punto en el mapa.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude })
        setLocating(false)
      },
      () => {
        setLocating(false)
        setError('No pudimos obtener tu ubicación. Marca el punto en el mapa.')
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  function onPhotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setPhoto(reader.result) // dataURL
    reader.readAsDataURL(file)
  }

  function submit(e) {
    e.preventDefault()
    setError('')
    if (!pos) {
      setError('Indica la ubicación del semáforo (usa tu ubicación o toca el mapa).')
      return
    }
    if (!photo) {
      setError('Una foto es obligatoria para que el reporte sea accionable.')
      return
    }
    const created = createIncident({
      title,
      description,
      faultType,
      district,
      lat: pos.lat,
      lng: pos.lng,
      photo,
    })
    onCreated(created)
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <h2>Reportar semáforo</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        <form className="drawer-body" onSubmit={submit}>
          {error && <div className="warn">{error}</div>}

          <div className="field">
            <label>Ubicación del semáforo *</label>
            <div className="locate-row">
              <button type="button" className="btn btn-sm" onClick={useMyLocation} disabled={locating}>
                {locating ? 'Ubicando…' : '📍 Usar mi ubicación'}
              </button>
              <span className="coords">
                {pos ? `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}` : 'sin ubicación'}
              </span>
            </div>
            <div className="help">O toca el mapa para marcar el punto exacto.</div>
            <div className="mini-map" style={{ marginTop: 8 }}>
              <MapContainer center={LIMA_CENTER} zoom={12} scrollWheelZoom style={{ height: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <ClickToPlace pos={pos} setPos={setPos} />
                <Recenter pos={pos} />
              </MapContainer>
            </div>
          </div>

          {nearby.length > 0 && (
            <div className="warn">
              Hay {nearby.length} reporte(s) activo(s) a menos de 60&nbsp;m. ¿Es el mismo
              semáforo? Revisa el mapa antes de duplicar.
            </div>
          )}

          <div className="field">
            <label>Foto del semáforo *</label>
            <input
              ref={fileRef}
              className="input"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={onPhotoChange}
            />
            {photo && <img className="photo-preview" src={photo} alt="Vista previa" />}
          </div>

          <div className="field">
            <label>Cruce / referencia</label>
            <input
              className="input"
              type="text"
              placeholder="Ej: Av. Javier Prado con Av. Arequipa"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="field">
            <label>Tipo de falla</label>
            <select className="select" value={faultType} onChange={(e) => setFaultType(e.target.value)}>
              {FAULT_TYPES.map((f) => (
                <option key={f.key} value={f.key}>{f.label}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Distrito</label>
            <select className="select" value={district} onChange={(e) => setDistrict(e.target.value)}>
              {DISTRICTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Descripción</label>
            <textarea
              className="textarea"
              placeholder="¿Qué pasa exactamente? ¿Desde cuándo? ¿Es peligroso?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block">
            Publicar reporte
          </button>
          <div className="help" style={{ marginTop: 8 }}>
            Tu reporte será público en el mapa para dar visibilidad y exigir su reparación.
          </div>
        </form>
      </div>
    </div>
  )
}
