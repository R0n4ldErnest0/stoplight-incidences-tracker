import { useEffect, useRef } from 'react'

// Hace que el botón "atrás" del teléfono cierre un modal/pantalla en vez de
// salir de la app. Al montar el modal empuja una entrada al historial; cuando
// se presiona "atrás", el navegador la quita y disparamos onClose.
//
// No tocamos el historial al desmontar a propósito: hacerlo (history.back en el
// cleanup) provoca una carrera con el doble montaje de React StrictMode que
// cierra el modal al instante. La contrapartida es que, si el modal se cierra
// con la × en vez de "atrás", queda una entrada extra en el historial (un
// "atrás" que no hace nada visible antes de salir) — un detalle menor.
export function useBackClose(onClose) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const onPop = () => onCloseRef.current()
    window.history.pushState({ appModal: true }, '')
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
}
