import { screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api, reiniciarApi } from '../../test/api'
import { carrito, cliente, encargado, montarApp, pedido } from '../../test/app'
import type { EstadoPedido } from '../../types'

vi.mock('../../services/artcrate.service', async (original) =>
  (await import('../../test/api')).conApiFalsa(await original<typeof import('../../services/artcrate.service')>()))

const PEDIDOS = [
  pedido({ id: 1, estado: 'ENTREGADO', fecha: '2026-03-01T10:00:00' }),
  pedido({ id: 2, estado: 'PAGADO', fecha: '2026-05-01T10:00:00', usuarioId: encargado.id }),
  pedido({ id: 3, estado: 'PENDIENTE_PAGO', fecha: '2026-04-01T10:00:00' }),
  pedido({ id: 10, estado: 'PAGADO', fecha: '2026-02-01T10:00:00', usuarioId: 99 }),
]
const numeros = () => screen.getAllByRole('row').slice(1).map((f) => within(f).getAllByRole('cell')[0].textContent)

describe('Pedidos del panel', () => {
  beforeEach(() => {
    reiniciarApi()
    api.carritoApi.ver.mockResolvedValue(carrito([]))
    api.pedidosApi.todos.mockResolvedValue(PEDIDOS)
    api.usuariosApi.todos.mockResolvedValue([cliente, encargado])
  })

  describe('lista', () => {
    it('muestra primero el más reciente y el nombre del cliente (o "Usuario N" si ya no existe)', async () => {
      montarApp('/admin/pedidos', encargado)
      await screen.findByRole('row', { name: /#1\b/ })

      expect(numeros()).toEqual(['#2', '#3', '#1', '#10'])
      expect(within(screen.getByRole('row', { name: /#2\b/ })).getByText('Eduardo Soto')).toBeInTheDocument()
      expect(within(screen.getByRole('row', { name: /#10\b/ })).getByText('Usuario 99')).toBeInTheDocument()
    })

    it('los filtros por estado cuentan y filtran, y el estado queda en la URL', async () => {
      const u = montarApp('/admin/pedidos', encargado)
      await screen.findByRole('row', { name: /#1\b/ })

      expect(screen.getByRole('button', { name: 'Todos (4)' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Pagado (2)' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancelado (0)' })).toBeInTheDocument()
      await u.click(screen.getByRole('button', { name: 'Pagado (2)' }))

      expect(numeros()).toEqual(['#2', '#10'])
      expect(screen.getByTestId('ruta')).toHaveTextContent('?estado=PAGADO')
    })

    it('una URL con el estado ya viene filtrada (así llega desde el panel)', async () => {
      montarApp('/admin/pedidos?estado=PENDIENTE_PAGO', encargado)

      expect(await screen.findByRole('row', { name: /#3\b/ })).toBeInTheDocument()
      expect(numeros()).toEqual(['#3'])
    })

    it('se busca por número exacto (con o sin #) o por el nombre del cliente', async () => {
      const u = montarApp('/admin/pedidos', encargado)
      await screen.findByRole('row', { name: /#1\b/ })

      await u.type(screen.getByRole('searchbox'), '#1')
      expect(numeros()).toEqual(['#1']) // el 10 no coincide: es número exacto

      await u.clear(screen.getByRole('searchbox'))
      await u.type(screen.getByRole('searchbox'), 'eduardo')
      expect(numeros()).toEqual(['#2'])

      await u.clear(screen.getByRole('searchbox'))
      await u.type(screen.getByRole('searchbox'), 'nada')
      expect(screen.getByText('No hay pedidos en esta vista.')).toBeInTheDocument()
    })
  })

  describe('gestión de un pedido', () => {
    function abrir(estado: EstadoPedido) {
      api.pedidosApi.obtener.mockResolvedValue(pedido({ estado }))
      api.pagosApi.delPedido.mockResolvedValue([])
      api.usuariosApi.obtener.mockResolvedValue(cliente)
      return montarApp('/admin/pedidos/40', encargado)
    }

    it('muestra el cliente del pedido', async () => {
      abrir('PAGADO')

      expect(await screen.findByText('Camila Rojas')).toBeInTheDocument()
      expect(screen.getByText('camila@artcrate.cl')).toBeInTheDocument()
      expect(api.usuariosApi.obtener).toHaveBeenCalledWith(cliente.id)
    })

    it('un pedido pagado se puede marcar como enviado, y solo eso', async () => {
      api.pedidosApi.cambiarEstado.mockResolvedValue(pedido({ estado: 'ENVIADO' }))
      const u = abrir('PAGADO')
      await u.click(await screen.findByRole('button', { name: 'Marcar como enviado' }))

      expect(screen.queryByRole('button', { name: 'Cancelar pedido' })).not.toBeInTheDocument()
      await waitFor(() => expect(api.pedidosApi.cambiarEstado).toHaveBeenCalledWith(40, 'ENVIADO'))
      expect(await screen.findByText('El pedido pasó a "Enviado".')).toBeInTheDocument()
    })

    it('un pedido enviado se puede marcar como entregado', async () => {
      api.pedidosApi.cambiarEstado.mockResolvedValue(pedido({ estado: 'ENTREGADO' }))
      const u = abrir('ENVIADO')
      await u.click(await screen.findByRole('button', { name: 'Marcar como entregado' }))

      await waitFor(() => expect(api.pedidosApi.cambiarEstado).toHaveBeenCalledWith(40, 'ENTREGADO'))
    })

    it('un pedido pendiente de pago solo se puede cancelar, con confirmación', async () => {
      api.pedidosApi.cambiarEstado.mockResolvedValue(pedido({ estado: 'CANCELADO' }))
      const u = abrir('PENDIENTE_PAGO')
      await u.click(await screen.findByRole('button', { name: 'Cancelar pedido' }))

      expect(screen.queryByRole('button', { name: /Marcar como/ })).not.toBeInTheDocument()
      const dialogo = await screen.findByRole('dialog')
      expect(api.pedidosApi.cambiarEstado).not.toHaveBeenCalled()
      await u.click(within(dialogo).getByRole('button', { name: 'Cancelar pedido' }))

      await waitFor(() => expect(api.pedidosApi.cambiarEstado).toHaveBeenCalledWith(40, 'CANCELADO'))
    })

    it('si el administrador se arrepiente de cancelar, no pasa nada', async () => {
      const u = abrir('PENDIENTE_PAGO')
      await u.click(await screen.findByRole('button', { name: 'Cancelar pedido' }))
      await u.click(await screen.findByRole('button', { name: 'Volver' }))

      expect(api.pedidosApi.cambiarEstado).not.toHaveBeenCalled()
    })

    it.each([
      ['ENTREGADO', 'Este pedido ya fue entregado, no hay más pasos.'],
      ['CANCELADO', 'Un pedido cancelado no puede cambiar de estado.'],
    ] as const)('un pedido %s no ofrece ninguna acción', async (estado, texto) => {
      abrir(estado)

      expect(await screen.findByText(texto)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Marcar como|Cancelar pedido/ })).not.toBeInTheDocument()
    })

    it('si el servidor rechaza el cambio de estado muestra el motivo', async () => {
      api.pedidosApi.cambiarEstado.mockRejectedValue(new Error('Transición de estado no permitida'))
      const u = abrir('PAGADO')
      await u.click(await screen.findByRole('button', { name: 'Marcar como enviado' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('Transición de estado no permitida')
    })
  })
})
