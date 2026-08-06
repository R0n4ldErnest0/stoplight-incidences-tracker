import { useState, useRef, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import { LIMA_CENTER, FAULT_TYPES } from '../constants.js'
import { createIncident, findNearby } from '../data/store.js'
import { departamentos, provincias, distritos, titleCase } from '../data/peru.js'
import { reverseGeocodeUbigeo } from '../data/geo.js'
import { FiCamera, FiImage, FiMapPin, FiX, FiChevronDown } from 'react-icons/fi'
import { useBackClose } from '../useBackClose.js'

const MAX_PHOTOS = 4

const pickIcon = L.divIcon({
  className: '',
  html: '<div class="pin" style="background:#0284c7"></div>',
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
  const [departamento, setDepartamento] = useState('')
  const [provincia, setProvincia] = useState('')
  const [distrito, setDistrito] = useState('')
  const [description, setDescription] = useState('')
  const [locating, setLocating] = useState(false)
  const [locHint, setLocHint] = useState('') // guía cuando falla el GPS
  const [geoLoading, setGeoLoading] = useState(false) // detectando distrito
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [nearby, setNearby] = useState([])
  const cameraRef = useRef(null)
  const galleryRef = useRef(null)
  const faultSectionRef = useRef(null)

  useBackClose(onClose) // el botón "atrás" del teléfono cierra este formulario

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

  // Autocompleta departamento/provincia/distrito desde la ubicación (con debounce
  // para no saturar la geocodificación si se toca el mapa varias veces).
  useEffect(() => {
    if (!pos) return
    let active = true
    setGeoLoading(true)
    const t = setTimeout(() => {
      reverseGeocodeUbigeo(pos.lat, pos.lng)
        .then((m) => {
          if (!active) return
          if (m.departamento) setDepartamento(m.departamento)
          if (m.provincia) setProvincia(m.provincia)
          if (m.distrito) setDistrito(m.distrito)
        })
        .catch(() => {})
        .finally(() => active && setGeoLoading(false))
    }, 700)
    return () => {
      active = false
      clearTimeout(t)
    }
  }, [pos])

  // Agrega dataURLs respetando el máximo (usa el estado previo para no perder
  // fotos si llegan varias seguidas, p. ej. disparos consecutivos de la cámara).
  function addPhotoDataUrls(urls) {
    setPhotos((prev) => {
      const free = MAX_PHOTOS - prev.length
      if (free <= 0) return prev
      return [...prev, ...urls.slice(0, free)]
    })
  }

  async function addFiles(fileList) {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'))
    if (!files.length) return
    if (photos.length >= MAX_PHOTOS) {
      setError(`Máximo ${MAX_PHOTOS} fotos por reporte.`)
      return
    }
    setError('')
    const dataUrls = await Promise.all(files.map(readFileAsDataUrl))
    addPhotoDataUrls(dataUrls)
  }

  function onPhotoChange(e) {
    addFiles(e.target.files)
    e.target.value = '' // permite volver a elegir la misma foto
  }

  function removePhoto(idx) {
    setPhotos((prev) => prev.filter((_, i) => i !== idx))
  }

  function onDepartamentoChange(value) {
    setDepartamento(value)
    setProvincia('')
    setDistrito('')
  }
  function onProvinciaChange(value) {
    setProvincia(value)
    setDistrito('')
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
        departamento,
        provincia,
        distrito,
        district: distrito, // compatibilidad con el panel/lista existentes
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
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar"><FiX /></button>
        </div>
        <form className="drawer-body" onSubmit={submit}>
          {error && <div className="warn">{error}</div>}

          {/* ① Foto: lo primero y lo más importante del reporte. */}
          <div className="form-section-title">1 · Foto del semáforo</div>
          <div className="field">
            <div className="help" style={{ marginTop: 0, marginBottom: 8 }}>
              Toma una foto o elige imágenes de tu dispositivo. Hasta {MAX_PHOTOS}.
            </div>
            {/* Dos inputs ocultos: uno abre la cámara (capture, con su propia
                vista previa antes de aceptar), otro la galería. Un botón los
                ofrece en un menú, para que ambos caminos funcionen en el móvil. */}
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={onPhotoChange}
            />
            <input
              ref={galleryRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={onPhotoChange}
            />
            <div className="photo-buttons">
              <button
                type="button"
                className="btn btn-photo"
                onClick={() => cameraRef.current?.click()}
                disabled={photosFull}
              >
                <FiCamera /> Tomar foto
              </button>
              <button
                type="button"
                className="btn btn-photo"
                onClick={() => galleryRef.current?.click()}
                disabled={photosFull}
              >
                <FiImage /> Elegir de galería
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

          {/* ② Ubicación (todo lo geográfico junto). */}
          <div className="form-section-title">2 · Ubicación</div>
          <div className="field">
            <button
              type="button"
              className="btn btn-primary btn-locate"
              onClick={useMyLocation}
              disabled={locating}
            >
              {locating ? 'Ubicando…' : <><FiMapPin /> Usar mi ubicación</>}
            </button>
            <div className="coords" style={{ marginTop: 6 }}>
              {pos ? `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}` : 'Sin ubicación · o toca el mapa'}
            </div>
            {locHint && <div className="warn" style={{ margin: '8px 0 0' }}>{locHint}</div>}
            {/* El mapa captura los gestos de arrastre para desplazarse (pan), así
                que en móvil el dedo puede quedar "atrapado" ahí en vez de bajar la
                página. El botón vive DENTRO del recuadro fijo del mapa (esquina),
                nunca se superpone al resto del mapa ni depende del scroll — a
                diferencia de un botón "sticky" pegado al viewport, que en mapas
                más altos que la pantalla queda flotando sobre el mapa y bloquea
                los toques para fijar el punto. */}
            <div className="map-frame" style={{ marginTop: 8 }}>
              <div className="mini-map">
                <MapContainer center={LIMA_CENTER} zoom={12} scrollWheelZoom style={{ height: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <ClickToPlace pos={pos} setPos={setPos} />
                  <Recenter pos={pos} />
                </MapContainer>
              </div>
              <button
                type="button"
                className="map-continue-btn"
                onClick={() => faultSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              >
                <FiChevronDown /> Seguir
              </button>
            </div>
            <div className="help">Ubicación por OpenStreetMap. Toca el mapa para ajustar el punto.</div>
          </div>

          {nearby.length > 0 && (
            <div className="warn">
              Hay {nearby.length} reporte(s) activo(s) a menos de 60&nbsp;m. ¿Es el mismo
              semáforo? Revisa el mapa antes de duplicar.
            </div>
          )}

          <div className="field">
            <label>Departamento {geoLoading && <span className="help-inline">detectando…</span>}</label>
            <select
              className="select"
              aria-label="Departamento"
              value={departamento}
              onChange={(e) => onDepartamentoChange(e.target.value)}
            >
              <option value="">Selecciona…</option>
              {departamentos().map((d) => (
                <option key={d} value={d}>{titleCase(d)}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Provincia</label>
            <select
              className="select"
              aria-label="Provincia"
              value={provincia}
              onChange={(e) => onProvinciaChange(e.target.value)}
              disabled={!departamento}
            >
              <option value="">{departamento ? 'Selecciona…' : 'Elige un departamento primero'}</option>
              {provincias(departamento).map((p) => (
                <option key={p} value={p}>{titleCase(p)}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Distrito</label>
            <select
              className="select"
              aria-label="Distrito"
              value={distrito}
              onChange={(e) => setDistrito(e.target.value)}
              disabled={!provincia}
            >
              <option value="">{provincia ? 'Selecciona…' : 'Elige una provincia primero'}</option>
              {distritos(departamento, provincia).map((d) => (
                <option key={d} value={d}>{titleCase(d)}</option>
              ))}
            </select>
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

          {/* ③ La falla (qué pasa con el semáforo). */}
          <div className="form-section-title" ref={faultSectionRef}>3 · La falla</div>
          <div className="field">
            <label>Tipo de falla</label>
            <select className="select" value={faultType} onChange={(e) => setFaultType(e.target.value)}>
              {FAULT_TYPES.map((f) => (
                <option key={f.key} value={f.key}>{f.label}</option>
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

          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={submitting}>
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
