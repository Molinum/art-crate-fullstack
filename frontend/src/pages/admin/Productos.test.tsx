import { screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api, reiniciarApi } from '../../test/api'
import { carrito, encargado, montarApp, producto } from '../../test/app'
import type { Producto } from '../../types'

vi.mock('../../services/artcrate.service', async (original) =>
  (await import('../../test/api')).conApiFalsa(await original<typeof import('../../services/artcrate.service')>()))

// 12 productos activos (P01..P12, precio creciente) y 1 inactivo (P13)
const ACTIVOS: Producto[] = Array.from({ length: 12 }, (_, i) => {
  const n = i + 1
  return producto(n, { nombre: `P${String(n).padStart(2, '0')}`, sku: `SKU-${n}`, precio: n * 1000, categoriaNombre: n % 2 ? 'Acuarela' : 'Lápices' })
})
const INACTIVO = producto(13, { nombre: 'P13', sku: 'SKU-13', precio: 6500, activo: false })
// stock: P1 sin stock, P2 con 5 (límite de "bajo"), P3 con 6 (ya no es bajo), el inactivo sin stock (no cuenta como bajo)
const STOCK = [...ACTIVOS, INACTIVO].map((p) => ({ productoId: p.id, cantidad: p.id === 1 ? 0 : p.id === 2 ? 5 : p.id === 13 ? 0 : p.id === 3 ? 6 : 20 }))

const nombres = () => screen.getAllByRole('row').slice(1).map((f) => within(f).getAllByRole('cell')[0].textContent?.match(/P\d\d/)?.[0])

async function abrir(ruta = '/admin/productos', primera = /P01/) {
  const u = montarApp(ruta, encargado)
  await screen.findByRole('row', { name: primera })
  return u
}

describe('Lista de productos del panel', () => {
  beforeEach(() => {
    reiniciarApi()
    api.carritoApi.ver.mockResolvedValue(carrito([]))
    api.catalogoApi.productos.mockResolvedValue([...ACTIVOS, INACTIVO])
    api.inventarioApi.todos.mockResolvedValue(STOCK)
  })

  it('pagina de a 10, con los activos primero y los inactivos al final', async () => {
    const u = await abrir()

    expect(nombres()).toEqual(['P01', 'P02', 'P03', 'P04', 'P05', 'P06', 'P07', 'P08', 'P09', 'P10'])
    expect(screen.getByText('Página 1 de 2 · 13 productos')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '← Anterior' })).toBeDisabled()

    await u.click(screen.getByRole('button', { name: 'Siguiente →' }))
    expect(nombres()).toEqual(['P11', 'P12', 'P13'])
    expect(screen.getByRole('button', { name: 'Siguiente →' })).toBeDisabled()
  })

  it('ordena por una columna y al repetir el clic invierte el sentido', async () => {
    const u = await abrir()
    await u.click(screen.getByRole('button', { name: /^Precio/ }))
    expect(nombres().slice(0, 3)).toEqual(['P01', 'P02', 'P03'])
    expect(screen.getByRole('columnheader', { name: /Precio/ })).toHaveAttribute('aria-sort', 'ascending')

    await u.click(screen.getByRole('button', { name: /^Precio/ }))
    expect(nombres().slice(0, 3)).toEqual(['P12', 'P11', 'P10'])
    expect(screen.getByRole('columnheader', { name: /Precio/ })).toHaveAttribute('aria-sort', 'descending')
  })

  it('ordenar vuelve a la primera página', async () => {
    const u = await abrir()
    await u.click(screen.getByRole('button', { name: 'Siguiente →' }))
    await u.click(screen.getByRole('button', { name: 'Stock' }))

    expect(screen.getByText(/Página 1 de 2/)).toBeInTheDocument()
  })

  it('"Stock bajo" incluye hasta 5 unidades y deja fuera los inactivos', async () => {
    const u = await abrir()
    expect(screen.getByRole('button', { name: 'Stock bajo (2)' })).toBeInTheDocument()
    await u.click(screen.getByRole('button', { name: 'Stock bajo (2)' }))

    expect(nombres()).toEqual(['P01', 'P02'])
    expect(screen.getByTestId('ruta')).toHaveTextContent('?filtro=stock-bajo')
  })

  it('los filtros Activos e Inactivos cuentan y filtran', async () => {
    const u = await abrir()
    expect(screen.getByRole('button', { name: 'Activos (12)' })).toBeInTheDocument()
    await u.click(screen.getByRole('button', { name: 'Inactivos (1)' }))

    expect(nombres()).toEqual(['P13'])
  })

  it('el buscador encuentra por SKU o categoría y avisa si no hay resultados', async () => {
    const u = await abrir()
    await u.type(screen.getByRole('searchbox'), 'sku-7')
    expect(nombres()).toEqual(['P07'])

    await u.clear(screen.getByRole('searchbox'))
    await u.type(screen.getByRole('searchbox'), 'lápices')
    expect(nombres()).toEqual(['P02', 'P04', 'P06', 'P08', 'P10', 'P12'])

    await u.clear(screen.getByRole('searchbox'))
    await u.type(screen.getByRole('searchbox'), 'zzz')
    expect(screen.getByText('No hay productos en esta vista.')).toBeInTheDocument()
  })

  it('la etiqueta de stock distingue sin stock, pocas unidades y suficiente', async () => {
    await abrir()
    const celdaStock = (p: string) => within(screen.getByRole('row', { name: new RegExp(p) })).getByText(/^\d+$/)

    expect(celdaStock('P01')).toHaveClass('text-bg-danger')
    expect(celdaStock('P02')).toHaveClass('text-bg-warning')
    expect(celdaStock('P03')).not.toHaveClass('text-bg-warning')
  })

  describe('desactivar y activar', () => {
    it('desactivar pide confirmación y, al aceptar, guarda el producto con activo = false', async () => {
      api.catalogoApi.actualizar.mockResolvedValue(ACTIVOS[0])
      const u = await abrir()
      await u.click(within(screen.getByRole('row', { name: /P01/ })).getByRole('button', { name: 'Desactivar' }))

      const dialogo = await screen.findByRole('dialog')
      expect(dialogo).toHaveTextContent('"P01" dejará de mostrarse en la tienda')
      expect(api.catalogoApi.actualizar).not.toHaveBeenCalled()
      await u.click(within(dialogo).getByRole('button', { name: 'Desactivar' }))

      await waitFor(() => expect(api.catalogoApi.actualizar).toHaveBeenCalledWith(1, expect.objectContaining({ sku: 'SKU-1', activo: false })))
      expect(await screen.findByText('"P01" quedó desactivado.')).toBeInTheDocument()
      await waitFor(() => expect(api.catalogoApi.productos).toHaveBeenCalledTimes(2)) // recarga la lista
    })

    it('si se cancela la confirmación no se guarda nada', async () => {
      const u = await abrir()
      await u.click(within(screen.getByRole('row', { name: /P01/ })).getByRole('button', { name: 'Desactivar' }))
      await u.click(await screen.findByRole('button', { name: 'Volver' }))

      expect(api.catalogoApi.actualizar).not.toHaveBeenCalled()
    })

    it('activar un producto inactivo es directo, sin confirmación', async () => {
      api.catalogoApi.actualizar.mockResolvedValue(INACTIVO)
      const u = await abrir('/admin/productos?filtro=inactivos', /P13/)
      await u.click(await screen.findByRole('button', { name: 'Activar' }))

      await waitFor(() => expect(api.catalogoApi.actualizar).toHaveBeenCalledWith(13, expect.objectContaining({ activo: true })))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('si el servidor falla muestra el error y deja la lista como estaba', async () => {
      api.catalogoApi.actualizar.mockRejectedValue(new Error('No se pudo guardar'))
      const u = await abrir('/admin/productos?filtro=inactivos', /P13/)
      await u.click(await screen.findByRole('button', { name: 'Activar' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo guardar')
      expect(api.catalogoApi.productos).toHaveBeenCalledTimes(1)
    })
  })
})
