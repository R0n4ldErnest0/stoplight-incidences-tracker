import { useState } from 'react'
import { FiSearch, FiSliders, FiX, FiFilter, FiMapPin, FiAlertTriangle, FiUser } from 'react-icons/fi'
import { STATUSES, STATUS_ORDER, FAULT_TYPES } from '../constants.js'

// Barra de la pestaña Lista: buscador (código, cruce, descripción, distrito)
// siempre visible, y filtros. En mobile los filtros se pliegan detrás del
// botón "Filtros (n)" para no ocupar media pantalla; en escritorio siempre
// están abiertos (ver .list-filters en styles.css).
// El estado vive en App.jsx (estado y fecha se comparten con el mapa).
export default function ListToolbar({
  query, onQuery,
  status, onStatus, stats,
  dep, onDep, depOptions,
  dist, onDist, distOptions,
  fault, onFault,
  onlyMine, onOnlyMine, myCount,
  activeCount, onClear,
  dateControl, hiddenControl,
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="list-toolbar">
      <div className="list-search-row">
        <label className="list-search">
          <FiSearch aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Buscar por código, cruce o distrito"
            aria-label="Buscar reportes"
            enterKeyHint="search"
          />
          {query && (
            <button type="button" className="list-search-clear" onClick={() => onQuery('')} aria-label="Borrar búsqueda">
              <FiX />
            </button>
          )}
        </label>
        <button
          type="button"
          className={open ? 'btn btn-sm list-filters-toggle open' : 'btn btn-sm list-filters-toggle'}
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          <FiSliders /> Filtros{activeCount > 0 ? ` (${activeCount})` : ''}
        </button>
      </div>

      <div className={open ? 'list-filters open' : 'list-filters'}>
        {myCount > 0 && (
          <label className={onlyMine ? 'mine-toggle active' : 'mine-toggle'}>
            <input type="checkbox" checked={onlyMine} onChange={(e) => onOnlyMine(e.target.checked)} />
            <FiUser /> Mis reportes ({myCount})
          </label>
        )}
        <label className="date-filter" title="Filtrar por estado">
          <FiFilter />
          <select className="date-select" value={status} onChange={(e) => onStatus(e.target.value)} aria-label="Estado">
            <option value="all">Todos los estados ({stats.total})</option>
            {STATUS_ORDER.map((key) => (
              <option key={key} value={key}>
                {STATUSES[key].label} ({stats.byStatus[key] || 0})
              </option>
            ))}
          </select>
        </label>
        {dateControl}
        <label className="date-filter" title="Filtrar por departamento">
          <FiMapPin />
          <select className="date-select" value={dep} onChange={(e) => onDep(e.target.value)} aria-label="Departamento">
            <option value="">Todos los departamentos</option>
            {depOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <label className="date-filter" title="Filtrar por distrito">
          <FiMapPin />
          <select className="date-select" value={dist} onChange={(e) => onDist(e.target.value)} aria-label="Distrito">
            <option value="">Todos los distritos</option>
            {distOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <label className="date-filter" title="Filtrar por tipo de falla">
          <FiAlertTriangle />
          <select className="date-select" value={fault} onChange={(e) => onFault(e.target.value)} aria-label="Tipo de falla">
            <option value="">Todas las fallas</option>
            {FAULT_TYPES.map((f) => (
              <option key={f.key} value={f.key}>{f.label}</option>
            ))}
          </select>
        </label>
        {hiddenControl}
        {activeCount > 0 && (
          <button type="button" className="btn btn-sm list-clear" onClick={onClear}>
            <FiX /> Limpiar filtros
          </button>
        )}
      </div>
    </div>
  )
}
