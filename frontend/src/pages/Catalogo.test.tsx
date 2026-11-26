import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api, reiniciarApi } from '../test/api'
import { carrito, cliente, montarApp, producto } from '../test/app'

vi.mock('../services/artcrate.service', async (original) =>
  (await import('../test/api')).conApiFalsa(await original<typeof import('../services/artcrate.service')>()))

const CATEGORIAS = [{ id: 1, nombre: 'Acuarela', descripcion: '' }, { id: 2, nombre: 'Lápices', descripcion: '' }]
const PRODUCTOS = [
  producto(1, { nombre: 'Pincel', precio: 3000 }),
  producto(2, { nombre: 'Acuarela 24', precio: 25000 }),
  producto(3, { nombre: 'Borrador', precio: 1500 }),
  producto(4, { nombre: 'Producto retirado', precio: 100, activo: false }),
]

// Los nombres de las tarjetas en el orden en que aparecen en pantalla
const nombresEnPantalla = () => screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)

describe('Catálogo', () => {
  beforeEach(() => {
    reiniciarApi()
    api.catalogoApi.categorias.mockResolvedValue(CATEGORIAS)
    api.catalogoApi.productos.mockResolvedValue(PRODUCTOS)
    api.inventarioApi.todos.mockResolvedValue([{ productoId: 1, cantidad: 10 }, { productoId: 2, cantidad: 0 }, { productoId: 3, cantidad: 4 }])
    api.carritoApi.ver.mockResolvedValue(carrito([]))
  })

  it('solo muestra productos activos y cuenta cuántos hay', async () => {
    montarApp('/catalogo')

    expect(await screen.findByText('3 productos')).toBeInTheDocument()
    expect(nombresEnPantalla()).not.toContain('Producto retirado')
  })

  it('con un único resultado el contador va en singular', async () => {
    api.catalogoApi.productos.mockResolvedValue([PRODUCTOS[0]])
    montarApp('/catalogo')

    expect(await screen.findByText('1 producto')).toBeInTheDocument()
  })

  it('si todos los productos están inactivos dice que no hay coincidencias', async () => {
    api.catalogoApi.productos.mockResolvedValue([PRODUCTOS[3]])
    montarApp('/catalogo')

    expect(await screen.findByText('No hay productos que coincidan.')).toBeInTheDocument()
  })

  it('ordena por precio, de menor a mayor y de mayor a menor', async () => {
    const u = montarApp('/catalogo')
    await screen.findByText('3 productos')

    await u.selectOptions(screen.getByLabelText('Ordenar productos'), 'precio-asc')
    expect(nombresEnPantalla()).toEqual(['Borrador', 'Pincel', 'Acuarela 24'])

    await u.selectOptions(screen.getByLabelText('Ordenar productos'), 'precio-desc')
    expect(nombresEnPantalla()).toEqual(['Acuarela 24', 'Pincel', 'Borrador'])
  })

  it('ordena por nombre alfabético', async () => {
    const u = montarApp('/catalogo')
    await screen.findByText('3 productos')
    await u.selectOptions(screen.getByLabelText('Ordenar productos'), 'nombre')

    expect(nombresEnPantalla()).toEqual(['Acuarela 24', 'Borrador', 'Pincel'])
  })

  it('elegir una categoría pide solo esos productos y la deja en la URL', async () => {
    const u = montarApp('/catalogo')
    await screen.findByText('3 productos')
    await u.click(screen.getByRole('button', { name: 'Lápices' }))

    await waitFor(() => expect(api.catalogoApi.productos).toHaveBeenLastCalledWith(2, undefined))
    expect(screen.getByTestId('ruta')).toHaveTextContent('/catalogo?categoria=2')
    expect(screen.getByRole('button', { name: 'Lápices' })).toHaveClass('active')

    await u.click(screen.getByRole('button', { name: 'Todos' }))
    await waitFor(() => expect(api.catalogoApi.productos).toHaveBeenLastCalledWith(undefined, undefined))
    expect(screen.getByTestId('ruta')).toHaveTextContent(/^\/catalogo$/)
  })

  it('buscar manda el texto sin espacios sobrantes y lo deja en la URL', async () => {
    const u = montarApp('/catalogo')
    await screen.findByText('3 productos')
    await u.type(screen.getByPlaceholderText('Buscar producto'), '  pincel  ')
    await u.click(screen.getByRole('button', { name: 'Buscar' }))

    await waitFor(() => expect(api.catalogoApi.productos).toHaveBeenLastCalledWith(undefined, 'pincel'))
    expect(screen.getByTestId('ruta')).toHaveTextContent('/catalogo?q=pincel')
  })

  it('una búsqueda que viene en la URL (por ejemplo desde el inicio) ya aparece aplicada', async () => {
    montarApp('/catalogo?q=pincel&categoria=1')

    expect(screen.getByPlaceholderText('Buscar producto')).toHaveValue('pincel')
    await waitFor(() => expect(api.catalogoApi.productos).toHaveBeenCalledWith(1, 'pincel'))
  })

  it('los productos sin stock tienen el botón desactivado y los demás pueden agregarse', async () => {
    montarApp('/catalogo', cliente)
    await screen.findByText('3 productos')

    await waitFor(() => expect(screen.getByRole('button', { name: 'Agregar Acuarela 24 al carrito' })).toBeDisabled())
    expect(screen.getByRole('button', { name: 'Agregar Acuarela 24 al carrito' })).toHaveTextContent('Sin stock')
    expect(screen.getByRole('button', { name: 'Agregar Pincel al carrito' })).toBeEnabled()
  })

  it('si falla la consulta de stock los productos igual se pueden agregar (el servidor valida)', async () => {
    api.inventarioApi.todos.mockRejectedValue(new Error('inventario caído'))
    montarApp('/catalogo', cliente)

    expect(await screen.findByRole('button', { name: 'Agregar Pincel al carrito' })).toBeEnabled()
  })

  it('si falla la carga muestra el error y ninguna tarjeta', async () => {
    api.catalogoApi.productos.mockRejectedValue(new Error('No se pudo cargar el catálogo'))
    montarApp('/catalogo')

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar el catálogo')
    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0)
  })
})
