import { useEffect, useRef, useState } from 'react'

// Cámara dentro de la app (getUserMedia): vista en vivo + botón disparador +
// acceso a la galería, todo en una sola pantalla. Requiere contexto seguro
// (HTTPS o localhost); si no está disponible, ofrece elegir de la galería.
export default function CameraCapture({ onCapture, onPickGallery, onClose, count, max }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(
          'Tu navegador o conexión no permite abrir la cámara aquí ' +
            '(se necesita HTTPS). Puedes elegir una foto de la galería.'
        )
        return
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }
        setReady(true)
      } catch (err) {
        console.error(err)
        setError(
          'No se pudo abrir la cámara (¿permiso denegado o conexión no segura?). ' +
            'Puedes elegir una foto de la galería.'
        )
      }
    }
    start()
    return () => {
      cancelled = true
      // Libera la cámara al cerrar.
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  function shoot() {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    onCapture(canvas.toDataURL('image/jpeg', 0.85))
  }

  const full = count >= max

  return (
    <div className="cam-overlay" onClick={(e) => e.stopPropagation()}>
      <button type="button" className="cam-close" onClick={onClose} aria-label="Cerrar cámara">×</button>

      {error ? (
        <div className="cam-error">
          <p>{error}</p>
          <button type="button" className="btn btn-primary btn-lg" onClick={onPickGallery}>
            🖼️ Elegir de galería
          </button>
          <button type="button" className="cam-cancel" onClick={onClose}>Cancelar</button>
        </div>
      ) : (
        <>
          <video ref={videoRef} className="cam-video" autoPlay playsInline muted />
          {full && <div className="cam-hint">Llegaste al máximo de {max} fotos. Toca “Listo”.</div>}
          <div className="cam-controls">
            <button
              type="button"
              className="cam-gallery"
              onClick={onPickGallery}
              aria-label="Elegir de galería"
            >
              🖼️
            </button>
            <button
              type="button"
              className="cam-shutter"
              onClick={shoot}
              disabled={!ready || full}
              aria-label="Tomar foto"
            />
            <button type="button" className="cam-done" onClick={onClose}>
              {count > 0 ? `Listo (${count})` : 'Listo'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
