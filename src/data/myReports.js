// "Mis reportes": recuerda EN ESTE DISPOSITIVO qué reportes publicó la persona
// (solo sus ids, en localStorage), igual que se recuerdan los reportes ya
// marcados. No hay login ni datos personales: si se borran los datos del
// navegador o se cambia de teléfono, la lista se pierde — por eso el código
// público del reporte (LIM-MIR-000123) es el respaldo para buscarlo.
// Más adelante (fase 1 de seguridad, sesión anónima de Supabase) esto puede
// pasar a la BD sin cambiar la UI.

const MY_REPORTS_KEY = 'semaforo-alerta:my-reports:v1'

export function getMyReportIds() {
  try {
    const ids = JSON.parse(localStorage.getItem(MY_REPORTS_KEY))
    return Array.isArray(ids) ? ids : []
  } catch {
    return []
  }
}

export function addMyReport(id) {
  try {
    const ids = getMyReportIds()
    if (!ids.includes(id)) localStorage.setItem(MY_REPORTS_KEY, JSON.stringify([...ids, id]))
  } catch {
    // almacenamiento bloqueado (modo privado, etc.): el código sigue sirviendo
  }
}
