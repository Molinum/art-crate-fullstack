// Tipos que reflejan los DTO de respuesta del backend (ArtCrate-backend)

export interface Categoria {
  id: number
  nombre: string
  descripcion: string
}

export interface Producto {
  id: number
  sku: string
  nombre: string
  descripcion: string
  precio: number
  imagenUrl: string
  categoriaId: number
  categoriaNombre: string
  activo: boolean
}

export type Rol = 'ADMIN' | 'CLIENTE'

export interface Usuario {
  id: number
  nombre: string
  apellido: string
  correo: string
  telefono: string | null
  region: string | null
  rol: Rol
  activo: boolean
}

export interface RegistroRequest {
  nombre: string
  apellido: string
  correo: string
  password: string
  telefono?: string
  region?: string
}

export interface ItemCarrito {
  productoId: number
  nombre: string
  precioUnitario: number
  cantidad: number
  imagenUrl: string
  subtotal: number
}

export interface Carrito {
  id: number
  usuarioId: number
  items: ItemCarrito[]
  total: number
}

export type EstadoPedido = 'PENDIENTE_PAGO' | 'PAGADO' | 'ENVIADO' | 'ENTREGADO' | 'CANCELADO'

export interface ItemPedido {
  productoId: number
  nombre: string
  precioUnitario: number
  cantidad: number
  subtotal: number
}

export interface Pedido {
  id: number
  usuarioId: number
  fecha: string
  estado: EstadoPedido
  total: number
  direccionDespacho: string
  comuna: string
  region: string
  items: ItemPedido[]
}

export interface CrearPedidoRequest {
  usuarioId: number
  direccionDespacho: string
  comuna: string
  region: string
}

export type MetodoPago = 'TARJETA' | 'TRANSFERENCIA'

export interface Pago {
  id: number
  pedidoId: number
  monto: number
  metodo: MetodoPago
  estado: string
  fecha: string
  codigoTransaccion: string
}

export interface ProductoRequest {
  sku: string
  nombre: string
  descripcion: string
  precio: number
  imagenUrl: string
  categoriaId: number
  activo: boolean
}

export interface Stock {
  productoId: number
  cantidad: number
}
