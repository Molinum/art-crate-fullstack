interface Props {
  filtros: { clave: string; texto: string; total: number }[]
  activo: string
  onFiltro: (clave: string) => void
  busqueda: string
  onBusqueda: (texto: string) => void
  placeholder: string
}

// Filtros a la izquierda y buscador a la derecha: igual en productos, pedidos y usuarios
export function BarraFiltros({ filtros, activo, onFiltro, busqueda, onBusqueda, placeholder }: Props) {
  return (
    <div className="barra-filtros mb-3">
      <ul className="nav nav-pills gap-2">
        {filtros.map((f) => (
          <li className="nav-item" key={f.clave}>
            <button type="button" className={`nav-link ${activo === f.clave ? 'active' : ''}`} aria-pressed={activo === f.clave} onClick={() => onFiltro(f.clave)}>
              {f.texto} ({f.total})
            </button>
          </li>
        ))}
      </ul>
      <input
        className="form-control" type="search" placeholder={placeholder} aria-label={placeholder}
        value={busqueda} onChange={(e) => onBusqueda(e.target.value)}
      />
    </div>
  )
}
