import { screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Pago } from '../types'
import { api, reiniciarApi } from '../test/api'
import { admin, carrito, cliente, encargado, montarApp, pedido } from '../test/app'

vi.mock('../services/artcrate.service', async (original) =>
  (await import('../test/api')).conApiFalsa(await original<typeof import('../services/artcrate.service')>()))

const pago = (extra: Partial<Pago> = {}): Pago => ({
  id: 9, pedidoId: 40, monto: 25980, metodo: 'TARJETA', estado: 'APROBADO', fecha: '2026-05-10T15:40:00',
  codigoTransaccion: 'TX-ABC123', ultimosDigitos: '4242', motivoRechazo: null, ...extra,
})

// El pago simulado espera 1,2 s para que se vea "Procesando": las pruebas que pagan necesitan más margen
const ESPERA_PAGO = { timeout: 4000 }

describe('Detalle de pedido (cliente)', () => {
  beforeEach(() => {
    reiniciarApi()
    api.carritoApi.ver.mockResolvedValue(carrito([]))
    api.pedidosApi.obtener.mockResolvedValue(pedido())
    api.pagosApi.delPedido.mockResolvedValue([])
  })

  it('sin sesión pide ingresar', () => {
    montarApp('/pedidos/40')
    expect(screen.getByRole('link', { name: 'Ingresa' })).toHaveAttribute('href', '/login')
  })

  it('un cliente no puede ver el pedido de otra persona', async () => {
    montarApp('/pedidos/40', { ...cliente, id: 99 })

    expect(await screen.findByRole('alert')).toHaveTextContent('No tienes acceso a este pedido.')
    expect(screen.queryByText('Av. Siempre Viva 742')).not.toBeInTheDocument()
  })

  it('el dueño ve los productos, el despacho y el formulario de pago de su pedido pendiente', async () => {
    montarApp('/pedidos/40', cliente)

    expect(await screen.findByRole('heading', { level: 1, name: 'Pedido #40' })).toBeInTheDocument()
    expect(screen.getByText('Av. Siempre Viva 742')).toBeInTheDocument()
    expect(screen.getByRole('row', { name: /Producto 1/ })).toHaveTextContent('2')
    expect(screen.getByRole('heading', { name: /Pagar el pedido · \$25\.980/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancelar pedido' })).toBeInTheDocument()
  })

  it('un encargado puede ver un pedido ajeno, pero no pagarlo ni cancelarlo', async () => {
    montarApp('/pedidos/40', encargado)

    await screen.findByRole('heading', { level: 1, name: 'Pedido #40' })
    expect(screen.queryByRole('heading', { name: /Pagar el pedido/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancelar pedido' })).not.toBeInTheDocument()
  })

  it('un administrador sí puede pagar un pedido ajeno', async () => {
    montarApp('/pedidos/40', admin)

    expect(await screen.findByRole('heading', { name: /Pagar el pedido/ })).toBeInTheDocument()
  })

  it('un pedido ya pagado muestra el pago y el comprobante, sin formulario', async () => {
    api.pedidosApi.obtener.mockResolvedValue(pedido({ estado: 'PAGADO' }))
    api.pagosApi.delPedido.mockResolvedValue([pago()])
    montarApp('/pedidos/40', cliente)

    expect(await screen.findByText('TX-ABC123')).toBeInTheDocument()
    expect(screen.getByText('•••• 4242')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver comprobante' })).toHaveAttribute('href', '/pedidos/40/comprobante')
    expect(screen.queryByRole('heading', { name: /Pagar el pedido/ })).not.toBeInTheDocument()
  })

  it('un pedido cancelado lo dice y no ofrece pagar', async () => {
    api.pedidosApi.obtener.mockResolvedValue(pedido({ estado: 'CANCELADO' }))
    montarApp('/pedidos/40', cliente)

    expect(await screen.findByText(/Este pedido fue cancelado/)).toBeInTheDocument()
    expect(screen.getByText('El pedido se canceló sin registrar un pago.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Pagar el pedido/ })).not.toBeInTheDocument()
  })

  it('un pedido que no existe muestra el error', async () => {
    api.pedidosApi.obtener.mockRejectedValue(new Error('Pedido no encontrado'))
    montarApp('/pedidos/999', cliente)

    expect(await screen.findByRole('alert')).toHaveTextContent('Pedido no encontrado')
  })

  describe('pagar', () => {
    it('por transferencia: aprueba, avisa y el pedido queda pagado sin formulario', async () => {
      api.pedidosApi.obtener.mockResolvedValueOnce(pedido()).mockResolvedValue(pedido({ estado: 'PAGADO' }))
      api.pagosApi.delPedido.mockResolvedValueOnce([]).mockResolvedValue([pago({ metodo: 'TRANSFERENCIA', ultimosDigitos: null })])
      api.pagosApi.pagar.mockResolvedValue(pago({ metodo: 'TRANSFERENCIA', ultimosDigitos: null }))
      const u = montarApp('/pedidos/40', cliente)
      await u.click(await screen.findByRole('button', { name: 'Transferencia' }))
      await u.click(screen.getByRole('button', { name: 'Ya realicé la transferencia' }))

      expect(await screen.findByText('¡Pago aprobado! Tu pedido quedó confirmado.', {}, ESPERA_PAGO)).toBeInTheDocument()
      expect(api.pagosApi.pagar).toHaveBeenCalledWith(40, 'TRANSFERENCIA', undefined)
      await waitFor(() => expect(screen.queryByRole('heading', { name: /Pagar el pedido/ })).not.toBeInTheDocument())
      expect(screen.getByText('TX-ABC123')).toBeInTheDocument()
    }, 10000)

    it('con una tarjeta rechazada explica el motivo, cuenta el intento y deja pagar de nuevo', async () => {
      const rechazo = pago({ estado: 'RECHAZADO', motivoRechazo: 'fondos insuficientes', ultimosDigitos: '0002' })
      api.pagosApi.delPedido.mockResolvedValueOnce([]).mockResolvedValue([rechazo])
      api.pagosApi.pagar.mockResolvedValue(rechazo)
      const u = montarApp('/pedidos/40', cliente)
      await u.type(await screen.findByLabelText('Número de tarjeta'), '4000000000000002')
      await u.type(screen.getByLabelText('Nombre en la tarjeta'), 'Camila Rojas')
      await u.type(screen.getByLabelText('Vencimiento'), '1230')
      await u.type(screen.getByLabelText('CVV'), '123')
      await u.click(screen.getByRole('button', { name: /^Pagar/ }))

      expect(await screen.findByRole('alert', {}, ESPERA_PAGO)).toHaveTextContent('Pago rechazado: fondos insuficientes')
      expect(api.pagosApi.pagar).toHaveBeenCalledWith(40, 'TARJETA', '0002') // nunca el número completo
      expect(await screen.findByText('Intentos de pago rechazados: 1')).toBeInTheDocument()
      expect(screen.queryByText(/¡Pago aprobado!/)).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /^Pagar/ })).toBeEnabled()
    }, 10000)

    it('si el servicio de pagos falla muestra el error y no da el pago por hecho', async () => {
      api.pagosApi.pagar.mockRejectedValue(new Error('Servicio de pagos no disponible'))
      const u = montarApp('/pedidos/40', cliente)
      await u.click(await screen.findByRole('button', { name: 'Transferencia' }))
      await u.click(screen.getByRole('button', { name: 'Ya realicé la transferencia' }))

      expect(await screen.findByRole('alert', {}, ESPERA_PAGO)).toHaveTextContent('Servicio de pagos no disponible')
      expect(screen.queryByText(/¡Pago aprobado!/)).not.toBeInTheDocument()
    }, 10000)
  })

  describe('cancelar', () => {
    it('pide confirmación y si el cliente se arrepiente no cancela nada', async () => {
      const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(false)
      const u = montarApp('/pedidos/40', cliente)
      await u.click(await screen.findByRole('button', { name: 'Cancelar pedido' }))

      expect(confirmar).toHaveBeenCalledWith(expect.stringContaining('volverán al inventario'))
      expect(api.pedidosApi.cambiarEstado).not.toHaveBeenCalled()
    })

    it('al confirmar cancela el pedido y la pantalla pasa a "cancelado"', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true)
      api.pedidosApi.obtener.mockResolvedValueOnce(pedido()).mockResolvedValue(pedido({ estado: 'CANCELADO' }))
      api.pedidosApi.cambiarEstado.mockResolvedValue(pedido({ estado: 'CANCELADO' }))
      const u = montarApp('/pedidos/40', cliente)
      await u.click(await screen.findByRole('button', { name: 'Cancelar pedido' }))

      expect(api.pedidosApi.cambiarEstado).toHaveBeenCalledWith(40, 'CANCELADO')
      expect(await screen.findByText('El pedido fue cancelado.')).toBeInTheDocument()
      await waitFor(() => expect(screen.queryByRole('heading', { name: /Pagar el pedido/ })).not.toBeInTheDocument())
    })
  })
})

describe('Mis pedidos', () => {
  beforeEach(() => {
    reiniciarApi()
    api.carritoApi.ver.mockResolvedValue(carrito([]))
  })

  it('lista los pedidos del usuario con el más reciente primero y solo ofrece "Pagar" en los pendientes', async () => {
    api.pedidosApi.deUsuario.mockResolvedValue([
      pedido({ id: 1, fecha: '2026-03-01T10:00:00', estado: 'ENTREGADO' }),
      pedido({ id: 3, fecha: '2026-05-01T10:00:00', estado: 'PENDIENTE_PAGO' }),
      pedido({ id: 2, fecha: '2026-04-01T10:00:00', estado: 'PAGADO' }),
    ])
    montarApp('/pedidos', cliente)

    await screen.findByRole('heading', { name: 'Pedido #3' })
    const titulos = within(screen.getByRole('main')).getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(titulos).toEqual(['Pedido #3', 'Pedido #2', 'Pedido #1'])
    expect(api.pedidosApi.deUsuario).toHaveBeenCalledWith(cliente.id)
    expect(screen.getAllByRole('link', { name: 'Pagar' })).toHaveLength(1)
  })

  it('con más de 3 productos resume y cuenta el resto', async () => {
    const items = [1, 2, 3, 4, 5].map((n) => ({ productoId: n, nombre: `P${n}`, precioUnitario: 100, cantidad: 1, subtotal: 100 }))
    api.pedidosApi.deUsuario.mockResolvedValue([pedido({ items })])
    montarApp('/pedidos', cliente)

    expect(await screen.findByText('1 × P1, 1 × P2, 1 × P3 y 2 más')).toBeInTheDocument()
  })

  it('sin pedidos invita a ir al catálogo', async () => {
    api.pedidosApi.deUsuario.mockResolvedValue([])
    montarApp('/pedidos', cliente)

    expect(await screen.findByText(/Aún no tienes pedidos/)).toBeInTheDocument()
    expect(within(screen.getByRole('main')).getByRole('link', { name: 'Ir al catálogo' })).toHaveAttribute('href', '/catalogo')
  })
})
