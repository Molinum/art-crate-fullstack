import { Campo } from './Campo'
import { REGIONES, comunasDe } from '../data/chile'

interface Props {
  idBase: string
  region: string
  comuna: string
  onChange: (region: string, comuna: string) => void
  errorRegion?: string
  errorComuna?: string
  onTocar?: (campo: 'region' | 'comuna') => void
}

// Dos selects encadenados: la lista de comunas depende de la región elegida
export function SelectorRegionComuna({ idBase, region, comuna, onChange, errorRegion, errorComuna, onTocar }: Props) {
  return (
    <>
      <Campo id={`${idBase}-region`} etiqueta="Región" error={errorRegion} className="col-md-6">
        <select
          id={`${idBase}-region`}
          className={`form-select ${errorRegion ? 'is-invalid' : ''}`}
          value={region}
          onChange={(e) => onChange(e.target.value, '')} // al cambiar de región se borra la comuna
          onBlur={() => onTocar?.('region')}
        >
          <option value="">Selecciona tu región</option>
          {REGIONES.map((r) => <option key={r.nombre} value={r.nombre}>{r.nombre}</option>)}
        </select>
      </Campo>
      <Campo id={`${idBase}-comuna`} etiqueta="Comuna" error={errorComuna} className="col-md-6">
        <select
          id={`${idBase}-comuna`}
          className={`form-select ${errorComuna ? 'is-invalid' : ''}`}
          value={comuna}
          disabled={!region}
          onChange={(e) => onChange(region, e.target.value)}
          onBlur={() => onTocar?.('comuna')}
        >
          <option value="">{region ? 'Selecciona tu comuna' : 'Primero elige una región'}</option>
          {comunasDe(region).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </Campo>
    </>
  )
}
