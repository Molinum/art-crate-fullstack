import { COLOR_ESTADO, ETIQUETA_ESTADO } from '../data/negocio'
import type { EstadoPedido } from '../types'

// Etiqueta de color con el estado de un pedido
export function InsigniaEstado({ estado }: { estado: EstadoPedido }) {
  return <span className={`badge ${COLOR_ESTADO[estado]}`}>{ETIQUETA_ESTADO[estado]}</span>
}
