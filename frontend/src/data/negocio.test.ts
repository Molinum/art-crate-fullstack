import { describe, expect, it } from 'vitest'
import type { EstadoPedido } from '../types'
import { COLOR_ESTADO, ESTADOS_VENDIDOS, ETIQUETA_ESTADO, FLUJO, STOCK_BAJO } from './negocio'

const TODOS: EstadoPedido[] = ['PENDIENTE_PAGO', 'PAGADO', 'ENVIADO', 'ENTREGADO', 'CANCELADO']

describe('reglas de negocio compartidas', () => {
  it('todos los estados tienen etiqueta y color', () => {
    for (const e of TODOS) {
      expect(ETIQUETA_ESTADO[e]).toBeTruthy()
      expect(COLOR_ESTADO[e]).toMatch(/^text-bg-/)
    }
  })

  it('el flujo normal va de pendiente a entregado y no incluye cancelado', () => {
    expect(FLUJO).toEqual(['PENDIENTE_PAGO', 'PAGADO', 'ENVIADO', 'ENTREGADO'])
  })

  it('solo cuentan como venta los pedidos pagados en adelante', () => {
    expect(ESTADOS_VENDIDOS).toEqual(['PAGADO', 'ENVIADO', 'ENTREGADO'])
    expect(ESTADOS_VENDIDOS).not.toContain('PENDIENTE_PAGO')
    expect(ESTADOS_VENDIDOS).not.toContain('CANCELADO')
  })

  it('el umbral de stock bajo es positivo', () => {
    expect(STOCK_BAJO).toBeGreaterThan(0)
  })
})
