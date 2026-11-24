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
  Rol,
  RegistroRequest,
  Stock,
  Usuario,
} from '../types'

// Todas las llamadas van al API Gateway (único con CORS habilitado)
const MENSAJE_GENERICO = 'Ocurrió un problema al procesar tu solicitud. Inténtalo nuevamente en unos minutos.'

// El token JWT lo guarda SesionContext al iniciar sesión y se envía en cada llamada
export const CLAVE_TOKEN = 'artcrate.token'
const leerToken = () => {
  try { return localStorage.getItem(CLAVE_TOKEN) } catch { return null }
}

async function pedir<T>(ruta: string, metodo = 'GET', cuerpo?: unknown): Promise<T> {
  let res: Response
  const token = leerToken()
  try {
    res = await fetch(API_URL + ruta, {
      method: metodo,
      headers: {
        ...(cuerpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
    })
  } catch {
    throw new Error(MENSAJE_GENERICO)
  }
  const texto = await res.text()
  const datos = texto ? JSON.parse(texto) : null
  // Token vencido o inválido: se cierra la sesión y se pide iniciar sesión de nuevo
  if (res.status === 401 && token) {
    localStorage.removeItem(CLAVE_TOKEN)
    localStorage.removeItem('artcrate.usuario')
    window.location.assign('/login')
    throw new Error('Tu sesión expiró. Inicia sesión nuevamente.')
  }
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
  crearCategoria: (nombre: string, descripcion: string) => pedir<Categoria>('/api/categorias', 'POST', { nombre, descripcion }),
  actualizarCategoria: (id: number, nombre: string, descripcion: string) =>
    pedir<Categoria>(`/api/categorias/${id}`, 'PUT', { nombre, descripcion }),
  eliminarCategoria: (id: number) => pedir<void>(`/api/categorias/${id}`, 'DELETE'),
  crear: (datos: ProductoRequest) => pedir<Producto>('/api/productos', 'POST', datos),
  actualizar: (id: number, datos: ProductoRequest) => pedir<Producto>(`/api/productos/${id}`, 'PUT', datos),
}

export const inventarioApi = {
  todos: () => pedir<Stock[]>('/api/inventario'),
  deProducto: (productoId: number) => pedir<Stock>(`/api/inventario/${productoId}`),
  fijar: (productoId: number, cantidad: number) => pedir<Stock>(`/api/inventario/${productoId}`, 'PUT', { cantidad }),
}

export const usuariosApi = {
  todos: () => pedir<Usuario[]>('/api/usuarios'),
  obtener: (id: number) => pedir<Usuario>(`/api/usuarios/${id}`),
  login: (correo: string, password: string) =>
    pedir<{ token: string; usuario: Usuario }>('/api/usuarios/login', 'POST', { correo, password }),
  registro: (datos: RegistroRequest) => pedir<Usuario>('/api/usuarios/registro', 'POST', datos),
  // Los usuarios no se eliminan: se desactivan (activo = false) y rol/activo se cambian con esta misma llamada
  actualizar: (u: Usuario, cambios: { rol?: Rol; activo?: boolean }) =>
    pedir<Usuario>(`/api/usuarios/${u.id}`, 'PUT', {
      nombre: u.nombre, apellido: u.apellido, telefono: u.telefono, region: u.region, rol: u.rol, activo: u.activo, ...cambios,
    }),
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
  obtener: (id: number) => pedir<Pedido>(`/api/pedidos/${id}`),
  deUsuario: (usuarioId: number) => pedir<Pedido[]>(`/api/pedidos/usuario/${usuarioId}`),
  todos: () => pedir<Pedido[]>('/api/pedidos'),
  cambiarEstado: (id: number, estado: EstadoPedido) => pedir<Pedido>(`/api/pedidos/${id}/estado`, 'PATCH', { estado }),
}

export const pagosApi = {
  delPedido: (pedidoId: number) => pedir<Pago[]>(`/api/pagos/pedido/${pedidoId}`),
  pagar: (pedidoId: number, metodo: MetodoPago) =>
    pedir<Pago>('/api/pagos', 'POST', { pedidoId, metodo }),
}

// imagenUrl viene como "assets/img/x.svg": se sirve desde /public
export const urlImagen = (imagenUrl: string) => '/' + imagenUrl.replace(/^\//, '')

export const precioCLP = (n: number) => '$' + n.toLocaleString('es-CL')

// Unidades totales de un carrito (suma de las cantidades de cada producto)
export const unidadesCarrito = (c: Carrito) => c.items.reduce((total, i) => total + i.cantidad, 0)

export const fechaHora = (iso: string) => new Date(iso).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })

// Los productos no se eliminan: para sacarlos de la tienda se vuelve a guardar el producto con activo = false
export const productoARequest = (p: Producto, activo: boolean): ProductoRequest => ({
  sku: p.sku,
  nombre: p.nombre,
  descripcion: p.descripcion,
  precio: p.precio,
  imagenUrl: p.imagenUrl,
  marca: p.marca ?? '',
  formato: p.formato ?? '',
  contenido: p.contenido ?? '',
  categoriaId: p.categoriaId,
  activo,
})
