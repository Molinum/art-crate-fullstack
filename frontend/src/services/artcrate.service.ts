import { API_URL } from './api.service'
import type {
  Carrito,
  Categoria,
  CrearPedidoRequest,
  EstadoPedido,
  MetodoPago,
  Pago,
  Pedido,
  Producto,
  ProductoRequest,
  RegistroRequest,
  Stock,
  Usuario,
} from '../types'

// Todas las llamadas van al API Gateway (único con CORS habilitado)
const MENSAJE_GENERICO = 'Ocurrió un problema al procesar tu solicitud. Inténtalo nuevamente en unos minutos.'

async function pedir<T>(ruta: string, metodo = 'GET', cuerpo?: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(API_URL + ruta, {
      method: metodo,
      headers: cuerpo !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
    })
  } catch {
    throw new Error(MENSAJE_GENERICO)
  }
  const texto = await res.text()
  const datos = texto ? JSON.parse(texto) : null
  if (!res.ok) {
    // los errores de validación (4xx) traen un mensaje pensado para el usuario; los 5xx no se muestran tal cual
    const mensaje = res.status < 500 ? (datos?.message ?? datos?.mensaje) : null
    throw new Error(mensaje ?? MENSAJE_GENERICO)
  }
  return datos as T
}

export const catalogoApi = {
  categorias: () => pedir<Categoria[]>('/api/categorias'),
  productos: (categoriaId?: number, q?: string) => {
    const p = new URLSearchParams()
    if (categoriaId) p.set('categoriaId', String(categoriaId))
    if (q) p.set('q', q)
    const qs = p.toString()
    return pedir<Producto[]>('/api/productos' + (qs ? `?${qs}` : ''))
  },
  producto: (id: number) => pedir<Producto>(`/api/productos/${id}`),
  crear: (datos: ProductoRequest) => pedir<Producto>('/api/productos', 'POST', datos),
  actualizar: (id: number, datos: ProductoRequest) => pedir<Producto>(`/api/productos/${id}`, 'PUT', datos),
  eliminar: (id: number) => pedir<void>(`/api/productos/${id}`, 'DELETE'),
}

export const inventarioApi = {
  todos: () => pedir<Stock[]>('/api/inventario'),
  fijar: (productoId: number, cantidad: number) => pedir<Stock>(`/api/inventario/${productoId}`, 'PUT', { cantidad }),
}

export const usuariosApi = {
  todos: () => pedir<Usuario[]>('/api/usuarios'),
  login: (correo: string, password: string) =>
    pedir<Usuario>('/api/usuarios/login', 'POST', { correo, password }),
  registro: (datos: RegistroRequest) => pedir<Usuario>('/api/usuarios/registro', 'POST', datos),
}

export const carritoApi = {
  ver: (usuarioId: number) => pedir<Carrito>(`/api/carritos/${usuarioId}`),
  agregar: (usuarioId: number, productoId: number, cantidad: number) =>
    pedir<Carrito>(`/api/carritos/${usuarioId}/items`, 'POST', { productoId, cantidad }),
  cambiarCantidad: (usuarioId: number, productoId: number, cantidad: number) =>
    pedir<Carrito>(`/api/carritos/${usuarioId}/items/${productoId}`, 'PUT', { cantidad }),
  quitar: (usuarioId: number, productoId: number) =>
    pedir<Carrito>(`/api/carritos/${usuarioId}/items/${productoId}`, 'DELETE'),
  vaciar: (usuarioId: number) => pedir<void>(`/api/carritos/${usuarioId}`, 'DELETE'),
}

export const pedidosApi = {
  crear: (datos: CrearPedidoRequest) => pedir<Pedido>('/api/pedidos', 'POST', datos),
  deUsuario: (usuarioId: number) => pedir<Pedido[]>(`/api/pedidos/usuario/${usuarioId}`),
  todos: () => pedir<Pedido[]>('/api/pedidos'),
  cambiarEstado: (id: number, estado: EstadoPedido) => pedir<Pedido>(`/api/pedidos/${id}/estado`, 'PATCH', { estado }),
}

export const pagosApi = {
  pagar: (pedidoId: number, metodo: MetodoPago) =>
    pedir<Pago>('/api/pagos', 'POST', { pedidoId, metodo }),
}

// imagenUrl viene como "assets/img/x.svg": se sirve desde /public
export const urlImagen = (imagenUrl: string) => '/' + imagenUrl.replace(/^\//, '')

export const precioCLP = (n: number) => '$' + n.toLocaleString('es-CL')
