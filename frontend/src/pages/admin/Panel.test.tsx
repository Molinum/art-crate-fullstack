import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api, reiniciarApi } from '../../test/api'
import { admin, carrito, cliente, encargado, montarApp, pedido, producto } from '../../test/app'

vi.mock('../../services/artcrate.service', async (original) =>
  (await import('../../test/api')).conApiFalsa(await original<typeof import('../../services/artcrate.service')>()))

const item = (productoId: number, nombre: string, cantidad: number, subtotal: number) => ({ productoId, nombre, precioUnitario: subtotal / cantidad, cantidad, subtotal })

const PRODUCTOS = [
  producto(1, { nombre: 'Pincel', categoriaNombre: 'Pinceles' }),
  producto(2, { nombre: 'Acuarela', categoriaNombre: 'Pinturas' }),
  producto(3, { nombre: 'Lápiz', categoriaNombre: 'Pinceles' }),
  producto(4, { nombre: 'Retirado', activo: false }),
]
// P1 sin stock, P2 con 3 unidades, P3 con 50; P4 está inactivo y sin stock: no debe contarse
const STOCK = [{ productoId: 1, cantidad: 0 }, { productoId: 2, cantidad: 3 }, { productoId: 3, cantidad: 50 }, { productoId: 4, cantidad: 0 }]
const PEDIDOS = [
  pedido({ id: 1, estado: 'PAGADO', total: 10000, fecha: '2026-05-03T10:00:00', items: [item(1, 'Pincel', 2, 6000), item(2, 'Acuarela', 1, 4000)] }),
  pedido({ id: 2, estado: 'ENTREGADO', total: 8000, fecha: '2026-05-01T10:00:00', usuarioId: encargado.id, items: [item(1, 'Pincel', 1, 3000), item(3, 'Lápiz', 1, 5000)] }),
  pedido({ id: 3, estado: 'PENDIENTE_PAGO', total: 7000, fecha: '2026-05-04T10:00:00' }),
  pedido({ id: 4, estado: 'CANCELADO', total: 99999, fecha: '2026-05-02T10:00:00' }),
]

const indicador = (titulo: string) => within(screen.getByRole('link', { name: new RegExp(titulo) }))

describe('Panel de administración', () => {
  beforeEach(() => {
    reiniciarApi()
    api.carritoApi.ver.mockResolvedValue(carrito([]))
    api.catalogoApi.productos.mockResolvedValue(PRODUCTOS)
    api.inventarioApi.todos.mockResolvedValue(STOCK)
    api.pedidosApi.todos.mockResolvedValue(PEDIDOS)
    api.usuariosApi.todos.mockResolvedValue([admin, encargado, cliente])
  })

  it('las ventas confirmadas suman solo pedidos pagados, enviados o entregados', async () => {
    montarApp('/admin', admin)
    await screen.findByRole('heading', { name: 'Panel de administración' })

    // 10.000 (pagado) + 8.000 (entregado); ni el pendiente (7.000) ni el cancelado (99.999)
    expect(indicador('Ventas confirmadas').getByText('$18.000')).toBeInTheDocument()
    expect(indicador('Ventas confirmadas').getByText('2 pedidos')).toBeInTheDocument()
  })

  it('cuenta lo que hay por enviar y lo que espera pago, con el monto pendiente', async () => {
    montarApp('/admin', admin)
    await screen.findByRole('heading', { name: 'Panel de administración' })

    expect(indicador('Por enviar').getByText('1')).toBeInTheDocument()
    expect(indicador('Por enviar').getByText('pedido pagado')).toBeInTheDocument()
    expect(indicador('Pendientes de pago').getByText('$7.000')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Por enviar/ })).toHaveAttribute('href', '/admin/pedidos?estado=PAGADO')
  })

  it('stock bajo cuenta sin stock + pocas unidades, solo de productos activos', async () => {
    montarApp('/admin', admin)
    await screen.findByRole('heading', { name: 'Panel de administración' })

    expect(indicador('Stock bajo').getByText('2')).toBeInTheDocument()
    expect(indicador('Stock bajo').getByText('1 sin stock')).toBeInTheDocument()
    const lista = within(screen.getByRole('heading', { name: 'Productos con poco stock' }).closest('section')!)
    expect(lista.getByText('Pincel')).toBeInTheDocument()
    expect(lista.getByText('Sin stock')).toBeInTheDocument()
    expect(lista.getByText('3 unidades')).toBeInTheDocument()
    expect(lista.queryByText('Retirado')).not.toBeInTheDocument()
    expect(lista.queryByText('Lápiz')).not.toBeInTheDocument()
  })

  it('"Pedidos por enviar" lista el pedido pagado con el nombre de su cliente', async () => {
    montarApp('/admin', admin)
    const seccion = within((await screen.findByRole('heading', { name: 'Pedidos por enviar' })).closest('section')!)

    expect(seccion.getByText(/#1 · Camila Rojas/)).toBeInTheDocument()
    expect(seccion.getByRole('link', { name: 'Gestionar' })).toHaveAttribute('href', '/admin/pedidos/1')
  })

  it('lo más vendido ordena por monto e ignora los pedidos no confirmados', async () => {
    montarApp('/admin', admin)
    const seccion = within((await screen.findByRole('heading', { name: 'Productos más vendidos' })).closest('section')!)

    // Pincel: 6.000 + 3.000 = 9.000 en 3 unidades; Lápiz 5.000; Acuarela 4.000
    expect(seccion.getByText('3 un. · $9.000')).toBeInTheDocument()
    const orden = seccion.getAllByText(/un\. ·/).map((e) => e.textContent)
    expect(orden).toEqual(['3 un. · $9.000', '1 un. · $5.000', '1 un. · $4.000'])
  })

  it('las ventas por categoría agrupan los productos de cada categoría', async () => {
    montarApp('/admin', admin)
    const seccion = within((await screen.findByRole('heading', { name: 'Ventas por categoría' })).closest('section')!)

    expect(within(seccion.getByText('Pinceles').parentElement!).getByText('$14.000')).toBeInTheDocument() // pincel 9.000 + lápiz 5.000
    expect(within(seccion.getByText('Pinturas').parentElement!).getByText('$4.000')).toBeInTheDocument()
  })

  it('los últimos pedidos van del más reciente al más antiguo', async () => {
    montarApp('/admin', admin)
    const tabla = within((await screen.findByRole('heading', { name: 'Últimos pedidos' })).closest('section')!)

    const numeros = tabla.getAllByRole('row').slice(1).map((f) => within(f).getAllByRole('cell')[0].textContent)
    expect(numeros).toEqual(['#3', '#1', '#4', '#2'])
  })

  it('sin ventas no inventa estadísticas', async () => {
    api.pedidosApi.todos.mockResolvedValue([pedido({ id: 7, estado: 'PENDIENTE_PAGO' })])
    montarApp('/admin', admin)
    await screen.findByRole('heading', { name: 'Panel de administración' })

    expect(indicador('Ventas confirmadas').getByText('$0')).toBeInTheDocument()
    expect(screen.getAllByText('Aún no hay ventas confirmadas.')).toHaveLength(2)
    expect(screen.getByText('No hay pedidos esperando envío.')).toBeInTheDocument()
  })

  it('si falla alguna de las cargas muestra el error en vez de números incompletos', async () => {
    api.inventarioApi.todos.mockRejectedValue(new Error('Inventario no disponible'))
    montarApp('/admin', admin)

    expect(await screen.findByRole('alert')).toHaveTextContent('Inventario no disponible')
    expect(screen.queryByText('Ventas confirmadas')).not.toBeInTheDocument()
  })
})
