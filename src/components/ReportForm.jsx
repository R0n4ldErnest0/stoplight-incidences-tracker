import { useState, useRef, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import { LIMA_CENTER, FAULT_TYPES, DISTRICTS } from '../constants.js'
import { createIncident, findNearby } from '../data/store.js'

const MAX_PHOTOS = 4

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

// Lee un File como dataURL (base64) para previsualizar y almacenar.
function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function ReportForm({ onClose, onCreated }) {
  const [pos, setPos] = useState(null)
  const [photos, setPhotos] = useState([]) // dataURLs (varias fotos)
  const [title, setTitle] = useState('')
  const [faultType, setFaultType] = useState(FAULT_TYPES[0].key)
  const [district, setDistrict] = useState(DISTRICTS[0])
  const [description, setDescription] = useState('')
  const [locating, setLocating] = useState(false)
  const [locHint, setLocHint] = useState('') // guía cuando falla el GPS
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [nearby, setNearby] = useState([])
  const cameraRef = useRef(null)
  const galleryRef = useRef(null)

  // Busca reportes cercanos cada vez que cambia la ubicación elegida.
  useEffect(() => {
    let active = true
    if (!pos) {
      setNearby([])
      return
    }
    findNearby(pos, 60)
      .then((found) => active && setNearby(found))
      .catch(() => active && setNearby([]))
    return () => {
      active = false
    }
  }, [pos])

  async function addFiles(fileList) {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'))
    if (!files.length) return
    const free = MAX_PHOTOS - photos.length
    if (free <= 0) {
      setError(`Máximo ${MAX_PHOTOS} fotos por reporte.`)
      return
    }
    setError('')
    const dataUrls = await Promise.all(files.slice(0, free).map(readFileAsDataUrl))
    setPhotos((prev) => [...prev, ...dataUrls].slice(0, MAX_PHOTOS))
  }

  function onCameraChange(e) {
    addFiles(e.target.files)
    e.target.value = '' // permite volver a tomar la misma foto
  }

  function onGalleryChange(e) {
    addFiles(e.target.files)
    e.target.value = ''
  }

  function removePhoto(idx) {
    setPhotos((prev) => prev.filter((_, i) => i !== idx))
  }

  function useMyLocation() {
    setError('')
    setLocHint('')
    if (!navigator.geolocation) {
      setLocHint('Tu navegador no permite geolocalización. Marca el punto en el mapa.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude })
        setLocating(false)
        setLocHint('')
      },
      (err) => {
        setLocating(false)
        // Mensaje según la causa, para que la persona sepa qué hacer.
        if (err.code === err.PERMISSION_DENIED) {
          setLocHint(
            'Permiso de ubicación bloqueado. Actívalo en el ícono 🔒/ⓘ junto a la dirección ' +
              'del navegador (o en Ajustes → la app) y vuelve a intentar. Mientras tanto, ' +
              'puedes tocar el mapa para marcar el punto.'
          )
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setLocHint(
            'No se pudo obtener tu ubicación. Activa el GPS/ubicación de tu dispositivo y ' +
              'asegúrate de tener señal, o toca el mapa para marcar el punto.'
          )
        } else {
          setLocHint(
            'La ubicación tardó demasiado. Vuelve a intentar con el GPS activado, o toca el ' +
              'mapa para marcar el punto.'
          )
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (photos.length === 0) {
      setError('Agrega al menos una foto del semáforo para que el reporte sea accionable.')
      return
    }
    if (!pos) {
      setError('Indica la ubicación del semáforo (usa tu ubicación o toca el mapa).')
      return
    }
    setSubmitting(true)
    try {
      const created = await createIncident({
        title,
        description,
        faultType,
        district,
        lat: pos.lat,
        lng: pos.lng,
        photos,
      })
      onCreated(created)
    } catch (err) {
      console.error(err)
      setError('No se pudo publicar el reporte: ' + (err.message || 'error desconocido'))
      setSubmitting(false)
    }
  }

  const photosFull = photos.length >= MAX_PHOTOS

  return (
    <div className="overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <h2>Reportar semáforo</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        <form className="drawer-body" onSubmit={submit}>
          {error && <div className="warn">{error}</div>}

          {/* 1) Foto: lo primero y lo más importante del reporte. */}
          <div className="field">
            <label>📷 Fotos del semáforo *</label>
            <div className="help" style={{ marginTop: 0, marginBottom: 8 }}>
              Toma una foto o sube imágenes desde tu dispositivo. Hasta {MAX_PHOTOS}.
            </div>

            {/* Inputs ocultos: uno abre la cámara, otro la galería. */}
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={onCameraChange}
            />
            <input
              ref={galleryRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={onGalleryChange}
            />

            <div className="photo-actions">
              <button
                type="button"
                className="btn btn-photo"
                onClick={() => cameraRef.current?.click()}
                disabled={photosFull}
              >
                📷 Tomar foto
              </button>
              <button
                type="button"
                className="btn btn-photo"
                onClick={() => galleryRef.current?.click()}
                disabled={photosFull}
              >
                🖼️ Subir de galería
              </button>
            </div>

            {photos.length > 0 && (
              <div className="photo-grid">
                {photos.map((src, i) => (
                  <div className="photo-thumb" key={i}>
                    <img src={src} alt={`Foto ${i + 1}`} />
                    <button
                      type="button"
                      className="photo-remove"
                      aria-label="Quitar foto"
                      onClick={() => removePhoto(i)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2) Ubicación. */}
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
            {locHint && <div className="warn" style={{ margin: '8px 0 0' }}>{locHint}</div>}
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

          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Publicando…' : 'Publicar reporte'}
          </button>
          <div className="help" style={{ marginTop: 8 }}>
            Tu reporte será público en el mapa para dar visibilidad y exigir su reparación.
          </div>
        </form>
      </div>
    </div>
  )
}
