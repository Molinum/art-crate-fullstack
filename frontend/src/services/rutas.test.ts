import { type InternalAxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Usuario } from '../types'
import { carritoApi, catalogoApi, http, inventarioApi, pagosApi, pedidosApi, usuariosApi } from './artcrate.service'

// Contrato con el API Gateway: qué método, ruta y cuerpo envía cada llamada.
// Si alguien cambia una ruta por error, o el backend cambia, estas pruebas lo muestran antes de que falle la tienda.
const adaptador = vi.fn()
const adaptadorReal = http.defaults.adapter

beforeEach(() => {
  http.defaults.adapter = adaptador
  adaptador.mockImplementation(async (config: InternalAxiosRequestConfig) => ({ data: '', status: 200, statusText: '', headers: {}, config }))
})
afterEach(() => {
  http.defaults.adapter = adaptadorReal
  adaptador.mockReset()
})

const usuario = { id: 5, nombre: 'Ana', apellido: 'Paz', telefono: '+56911112222', region: 'Coquimbo', rol: 'CLIENTE', activo: true } as Usuario
const producto = { sku: 'S', nombre: 'N', descripcion: 'D', precio: 100, imagenUrl: 'i', marca: '', formato: '', contenido: '', categoriaId: 1, activo: true }

const casos: [string, () => Promise<unknown>, string, string, unknown?][] = [
  ['categorías', () => catalogoApi.categorias(), 'GET', '/api/categorias'],
  ['productos sin filtro', () => catalogoApi.productos(), 'GET', '/api/productos'],
  ['productos por categoría', () => catalogoApi.productos(3), 'GET', '/api/productos?categoriaId=3'],
  ['productos por texto', () => catalogoApi.productos(undefined, 'pincel'), 'GET', '/api/productos?q=pincel'],
  ['productos por categoría y texto', () => catalogoApi.productos(3, 'pincel'), 'GET', '/api/productos?categoriaId=3&q=pincel'],
  ['un producto', () => catalogoApi.producto(7), 'GET', '/api/productos/7'],
  ['crear producto', () => catalogoApi.crear(producto), 'POST', '/api/productos', producto],
  ['actualizar producto', () => catalogoApi.actualizar(7, producto), 'PUT', '/api/productos/7', producto],
  ['crear categoría', () => catalogoApi.crearCategoria('Óleo', 'desc'), 'POST', '/api/categorias', { nombre: 'Óleo', descripcion: 'desc' }],
  ['actualizar categoría', () => catalogoApi.actualizarCategoria(2, 'Óleo', 'desc'), 'PUT', '/api/categorias/2', { nombre: 'Óleo', descripcion: 'desc' }],
  ['eliminar categoría', () => catalogoApi.eliminarCategoria(2), 'DELETE', '/api/categorias/2'],
  ['todo el inventario', () => inventarioApi.todos(), 'GET', '/api/inventario'],
  ['stock de un producto', () => inventarioApi.deProducto(7), 'GET', '/api/inventario/7'],
  ['fijar stock', () => inventarioApi.fijar(7, 12), 'PUT', '/api/inventario/7', { cantidad: 12 }],
  ['todos los usuarios', () => usuariosApi.todos(), 'GET', '/api/usuarios'],
  ['un usuario', () => usuariosApi.obtener(5), 'GET', '/api/usuarios/5'],
  ['login', () => usuariosApi.login('a@b.cl', 'x'), 'POST', '/api/usuarios/login', { correo: 'a@b.cl', password: 'x' }],
  ['registro', () => usuariosApi.registro({ nombre: 'A', apellido: 'B', correo: 'a@b.cl', password: 'x' }), 'POST', '/api/usuarios/registro', { nombre: 'A', apellido: 'B', correo: 'a@b.cl', password: 'x' }],
  ['ver carrito', () => carritoApi.ver(5), 'GET', '/api/carritos/5'],
  ['agregar al carrito', () => carritoApi.agregar(5, 7, 2), 'POST', '/api/carritos/5/items', { productoId: 7, cantidad: 2 }],
  ['cambiar cantidad', () => carritoApi.cambiarCantidad(5, 7, 3), 'PUT', '/api/carritos/5/items/7', { cantidad: 3 }],
  ['quitar del carrito', () => carritoApi.quitar(5, 7), 'DELETE', '/api/carritos/5/items/7'],
  ['vaciar carrito', () => carritoApi.vaciar(5), 'DELETE', '/api/carritos/5'],
  ['crear pedido', () => pedidosApi.crear({ usuarioId: 5, direccionDespacho: 'Calle 1', comuna: 'La Serena', region: 'Coquimbo' }), 'POST', '/api/pedidos', { usuarioId: 5, direccionDespacho: 'Calle 1', comuna: 'La Serena', region: 'Coquimbo' }],
  ['un pedido', () => pedidosApi.obtener(40), 'GET', '/api/pedidos/40'],
  ['pedidos de un usuario', () => pedidosApi.deUsuario(5), 'GET', '/api/pedidos/usuario/5'],
  ['todos los pedidos', () => pedidosApi.todos(), 'GET', '/api/pedidos'],
  ['cambiar estado del pedido', () => pedidosApi.cambiarEstado(40, 'ENVIADO'), 'PATCH', '/api/pedidos/40/estado', { estado: 'ENVIADO' }],
  ['pagos de un pedido', () => pagosApi.delPedido(40), 'GET', '/api/pagos/pedido/40'],
  ['pagar por transferencia', () => pagosApi.pagar(40, 'TRANSFERENCIA'), 'POST', '/api/pagos', { pedidoId: 40, metodo: 'TRANSFERENCIA' }],
]

describe('rutas de la API', () => {
  it.each(casos)('%s', async (_nombre, llamar, metodo, ruta, cuerpo) => {
    await llamar()

    const enviado = adaptador.mock.calls[0][0] as InternalAxiosRequestConfig
    expect(enviado.method?.toUpperCase()).toBe(metodo)
    expect(enviado.url).toBe(ruta)
    if (cuerpo === undefined) expect(enviado.data).toBeUndefined()
    else expect(JSON.parse(enviado.data as string)).toEqual(cuerpo)
  })

  it('actualizar un usuario cambia solo el rol o el estado y conserva el resto de sus datos', async () => {
    await usuariosApi.actualizar(usuario, { rol: 'ENCARGADO' })

    const enviado = adaptador.mock.calls[0][0] as InternalAxiosRequestConfig
    expect(enviado.method?.toUpperCase()).toBe('PUT')
    expect(enviado.url).toBe('/api/usuarios/5')
    expect(JSON.parse(enviado.data as string)).toEqual({
      nombre: 'Ana', apellido: 'Paz', telefono: '+56911112222', region: 'Coquimbo', rol: 'ENCARGADO', activo: true,
    })
  })

  it('una respuesta sin cuerpo (204) se entrega como null, no como texto vacío', async () => {
    await expect(carritoApi.vaciar(5)).resolves.toBeNull()
  })
})
