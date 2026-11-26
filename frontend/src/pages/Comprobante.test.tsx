import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Pago } from '../types'
import { api, reiniciarApi } from '../test/api'
import { carrito, cliente, montarApp, pedido } from '../test/app'

vi.mock('../services/artcrate.service', async (original) =>
  (await import('../test/api')).conApiFalsa(await original<typeof import('../services/artcrate.service')>()))

const pago = (extra: Partial<Pago> = {}): Pago => ({
  id: 9, pedidoId: 40, monto: 25980, metodo: 'TARJETA', estado: 'APROBADO', fecha: '2026-05-10T15:40:00',
  codigoTransaccion: 'TX-ABC123', ultimosDigitos: '4242', motivoRechazo: null, ...extra,
})

describe('Comprobante de pago', () => {
  beforeEach(() => {
    reiniciarApi()
    api.carritoApi.ver.mockResolvedValue(carrito([]))
    api.pedidosApi.obtener.mockResolvedValue(pedido({ estado: 'PAGADO' }))
    api.pagosApi.delPedido.mockResolvedValue([pago()])
  })

  it('sin sesión pide ingresar', () => {
    montarApp('/pedidos/40/comprobante')
    expect(screen.getByRole('link', { name: 'Ingresa' })).toBeInTheDocument()
  })

  it('muestra el pago aprobado, el despacho, los productos y el total pagado', async () => {
    montarApp('/pedidos/40/comprobante', cliente)

    expect(await screen.findByRole('heading', { name: 'Comprobante de pago' })).toBeInTheDocument()
    expect(screen.getByText('Camila Rojas')).toBeInTheDocument()
    expect(screen.getByText('Tarjeta (•••• 4242)')).toBeInTheDocument()
    expect(screen.getByText('TX-ABC123')).toBeInTheDocument()
    expect(screen.getByText('Av. Siempre Viva 742, Providencia, Metropolitana de Santiago')).toBeInTheDocument()
    expect(screen.getByRole('row', { name: /Total pagado/ })).toHaveTextContent('$25.980')
  })

  it('un pago por transferencia no muestra dígitos de tarjeta', async () => {
    api.pagosApi.delPedido.mockResolvedValue([pago({ metodo: 'TRANSFERENCIA', ultimosDigitos: null })])
    montarApp('/pedidos/40/comprobante', cliente)

    expect(await screen.findByText('Transferencia')).toBeInTheDocument()
    expect(screen.queryByText(/••••/)).not.toBeInTheDocument()
  })

  it('un pedido sin pago aprobado no tiene comprobante', async () => {
    api.pedidosApi.obtener.mockResolvedValue(pedido())
    api.pagosApi.delPedido.mockResolvedValue([])
    montarApp('/pedidos/40/comprobante', cliente)

    expect(await screen.findByText(/aún no tiene un pago aprobado/)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Comprobante de pago' })).not.toBeInTheDocument()
  })

  it('un pago rechazado no sirve como comprobante', async () => {
    api.pagosApi.delPedido.mockResolvedValue([pago({ estado: 'RECHAZADO', motivoRechazo: 'fondos insuficientes' })])
    montarApp('/pedidos/40/comprobante', cliente)

    expect(await screen.findByText(/aún no tiene un pago aprobado/)).toBeInTheDocument()
  })

  it('si lo ve alguien que no es el dueño, no se muestra el nombre del dueño', async () => {
    montarApp('/pedidos/40/comprobante', { ...cliente, id: 99, nombre: 'Otra', apellido: 'Persona' })

    expect(await screen.findByText('Usuario 2')).toBeInTheDocument()
    expect(screen.queryByText('Otra Persona')).not.toBeInTheDocument()
  })

  it('"Imprimir o guardar PDF" abre el diálogo de impresión', async () => {
    const imprimir = vi.spyOn(window, 'print').mockImplementation(() => {})
    const u = montarApp('/pedidos/40/comprobante', cliente)
    await u.click(await screen.findByRole('button', { name: 'Imprimir o guardar PDF' }))

    expect(imprimir).toHaveBeenCalledTimes(1)
  })

  it('si no se puede cargar el pedido muestra el error', async () => {
    api.pedidosApi.obtener.mockRejectedValue(new Error('Pedido no encontrado'))
    montarApp('/pedidos/999/comprobante', cliente)

    expect(await screen.findByRole('alert')).toHaveTextContent('Pedido no encontrado')
  })
})
