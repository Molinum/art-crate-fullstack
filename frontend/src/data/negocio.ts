import type { EstadoPedido } from '../types'

// Reglas de negocio compartidas por las vistas de cliente y de administración

export const STOCK_BAJO = 5 // desde esta cantidad hacia abajo se avisa "stock bajo"

export const ETIQUETA_ESTADO: Record<EstadoPedido, string> = {
  PENDIENTE_PAGO: 'Pendiente de pago',
  PAGADO: 'Pagado',
  ENVIADO: 'Enviado',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado',
}

// Clase de Bootstrap para el color de cada estado
export const COLOR_ESTADO: Record<EstadoPedido, string> = {
  PENDIENTE_PAGO: 'text-bg-warning',
  PAGADO: 'text-bg-info',
  ENVIADO: 'text-bg-enviado',
  ENTREGADO: 'text-bg-success',
  CANCELADO: 'text-bg-secondary',
}

// Camino normal de un pedido (CANCELADO queda fuera: solo se puede desde PENDIENTE_PAGO)
export const FLUJO: EstadoPedido[] = ['PENDIENTE_PAGO', 'PAGADO', 'ENVIADO', 'ENTREGADO']

// Estados en los que el pedido cuenta como venta confirmada
export const ESTADOS_VENDIDOS: EstadoPedido[] = ['PAGADO', 'ENVIADO', 'ENTREGADO']
