import { useEffect, useRef } from 'react'

// Hace que el botón "atrás" del teléfono cierre un modal/pantalla en vez de
// salir de la app. Al montar el modal empuja una entrada al historial; cuando
// se presiona "atrás", el navegador la quita y disparamos onClose.
//
// `url` es opcional: si se pasa (p. ej. el link compartible de un reporte),
// se usa como URL de esa entrada del historial en vez de repetir la actual —
// así la barra de direcciones refleja lo que está abierto. Quien use esto con
// una `url` propia debe cerrar SIEMPRE con `history.back()` (no llamando a
// onClose directo), para que la barra de direcciones vuelva a como estaba;
// ver IncidentDetail.jsx.
//
// No tocamos el historial al desmontar a propósito: hacerlo (history.back en el
// cleanup) provoca una carrera con el doble montaje de React StrictMode que
// cierra el modal al instante. La contrapartida es que, si el modal se cierra
// con la × en vez de "atrás", queda una entrada extra en el historial (un
// "atrás" que no hace nada visible antes de salir) — un detalle menor.
export function useBackClose(onClose, url) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const onPop = () => onCloseRef.current()
    if (url) {
      window.history.pushState({ appModal: true }, '', url)
    } else {
      window.history.pushState({ appModal: true }, '')
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
}
