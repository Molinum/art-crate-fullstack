import { describe, expect, it } from 'vitest'
import type { Producto } from '../types'
import { ordenarProductos, paginar } from './listaProductos'

const producto = (id: number, nombre: string, activo: boolean, precio: number) =>
  ({ id, nombre, activo, precio, categoriaNombre: 'Pintura' }) as Producto

const lista = [producto(1, 'Zeta', false, 100), producto(2, 'Beta', true, 300), producto(3, 'Alfa', true, 200)]
const stock = (id: number) => id * 10

describe('lista de productos del panel', () => {
  it('muestra primero los activos y, entre ellos, por nombre', () => {
    const r = ordenarProductos(lista, { campo: 'estado', ascendente: true }, stock)
    expect(r.map((p) => p.nombre)).toEqual(['Alfa', 'Beta', 'Zeta'])
  })

  it('ordena por precio en ambos sentidos', () => {
    expect(ordenarProductos(lista, { campo: 'precio', ascendente: true }, stock).map((p) => p.precio)).toEqual([100, 200, 300])
    expect(ordenarProductos(lista, { campo: 'precio', ascendente: false }, stock).map((p) => p.precio)).toEqual([300, 200, 100])
  })

  it('reparte en páginas y corrige una página fuera de rango', () => {
    const numeros = Array.from({ length: 23 }, (_, i) => i + 1)
    expect(paginar(numeros, 1).filas).toHaveLength(10)
    expect(paginar(numeros, 3).filas).toEqual([21, 22, 23])
    expect(paginar(numeros, 9)).toMatchObject({ actual: 3, paginas: 3 })
    expect(paginar([], 2)).toMatchObject({ actual: 1, paginas: 1, filas: [] })
  })
})
