import { screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api, reiniciarApi } from '../test/api'
import { carrito, cliente, montarApp, producto } from '../test/app'

vi.mock('../services/artcrate.service', async (original) =>
  (await import('../test/api')).conApiFalsa(await original<typeof import('../services/artcrate.service')>()))

const PINCEL = producto(5, { nombre: 'Pincel redondo', precio: 4990, marca: 'Winsor', formato: null, contenido: '1 unidad', categoriaId: 1 })

function configurar({ stock = 20, p = PINCEL }: { stock?: number; p?: typeof PINCEL } = {}) {
  api.catalogoApi.producto.mockResolvedValue(p)
  api.inventarioApi.deProducto.mockResolvedValue({ productoId: p.id, cantidad: stock })
  api.catalogoApi.productos.mockResolvedValue([])
  api.carritoApi.ver.mockResolvedValue(carrito([]))
}

const cantidad = () => screen.getByLabelText('Cantidad')
const agregar = () => screen.getByRole('button', { name: 'Agregar al carrito' })

describe('Detalle de producto', () => {
  beforeEach(() => {
    reiniciarApi()
    configurar()
  })

  it('muestra nombre, precio y descripción del producto pedido', async () => {
    montarApp('/producto/5')

    expect(await screen.findByRole('heading', { level: 1, name: 'Pincel redondo' })).toBeInTheDocument()
    expect(screen.getByText('$4.990')).toBeInTheDocument()
    expect(screen.getByText('Descripción 5')).toBeInTheDocument()
    expect(api.catalogoApi.producto).toHaveBeenCalledWith(5)
  })

  it('la ficha técnica solo lista los datos que el producto tiene', async () => {
    montarApp('/producto/5')
    const ficha = within(await screen.findByRole('table'))

    expect(ficha.getByRole('row', { name: /Marca/ })).toHaveTextContent('Winsor')
    expect(ficha.getByRole('row', { name: /Contenido/ })).toHaveTextContent('1 unidad')
    expect(ficha.queryByRole('row', { name: /Formato/ })).not.toBeInTheDocument() // formato es null
  })

  it.each([
    [20, 'Disponible'],
    [3, '¡Quedan 3 unidades!'],
    [5, '¡Quedan 5 unidades!'], // el límite de "pocas unidades" es 5 inclusive
    [6, 'Disponible'],
  ])('con %i unidades en stock muestra "%s"', async (stock, texto) => {
    configurar({ stock })
    montarApp('/producto/5')

    expect(await screen.findByText(texto)).toBeInTheDocument()
    expect(agregar()).toBeEnabled()
  })

  it('sin stock queda "No disponible" y no se puede agregar', async () => {
    configurar({ stock: 0 })
    montarApp('/producto/5')

    expect(await screen.findByText('No disponible')).toBeInTheDocument()
    expect(agregar()).toBeDisabled()
  })

  it('un producto desactivado no se puede agregar aunque haya stock', async () => {
    configurar({ stock: 50, p: { ...PINCEL, activo: false } })
    montarApp('/producto/5')

    expect(await screen.findByText('No disponible')).toBeInTheDocument()
    expect(agregar()).toBeDisabled()
  })

  it('la cantidad no puede superar el stock: se corrige al salir del campo', async () => {
    configurar({ stock: 4 })
    const u = montarApp('/producto/5')
    await screen.findByText('¡Quedan 4 unidades!')

    await u.clear(cantidad())
    await u.type(cantidad(), '50')
    await u.tab()
    expect(cantidad()).toHaveValue(4)
  })

  it('si se deja la cantidad vacía o en cero vuelve a 1', async () => {
    const u = montarApp('/producto/5')
    await screen.findByRole('heading', { level: 1 })

    await u.clear(cantidad())
    await u.tab()
    expect(cantidad()).toHaveValue(1)

    await u.clear(cantidad())
    await u.type(cantidad(), '0')
    await u.tab()
    expect(cantidad()).toHaveValue(1)
  })

  it('agrega la cantidad elegida, confirma y actualiza el contador del menú con la respuesta del servidor', async () => {
    api.carritoApi.agregar.mockResolvedValue(carrito([{ productoId: 5, nombre: 'Pincel redondo', precioUnitario: 4990, cantidad: 3 }]))
    const u = montarApp('/producto/5', cliente)
    await screen.findByRole('heading', { level: 1 })
    await u.clear(cantidad())
    await u.type(cantidad(), '3')
    await u.click(agregar())

    expect(api.carritoApi.agregar).toHaveBeenCalledWith(cliente.id, 5, 3)
    expect(await screen.findByText(/Producto agregado al carrito/)).toBeInTheDocument()
    expect(screen.getByLabelText('3 productos en el carrito')).toBeInTheDocument()
  })

  it('sin sesión, agregar lleva a iniciar sesión y no toca el carrito', async () => {
    const u = montarApp('/producto/5')
    await screen.findByRole('heading', { level: 1 })
    await u.click(agregar())

    await waitFor(() => expect(screen.getByTestId('ruta')).toHaveTextContent('/login'))
    expect(api.carritoApi.agregar).not.toHaveBeenCalled()
  })

  it('si el servidor rechaza agregar (stock), muestra el motivo y no confirma', async () => {
    api.carritoApi.agregar.mockRejectedValue(new Error('No hay stock suficiente'))
    const u = montarApp('/producto/5', cliente)
    await screen.findByRole('heading', { level: 1 })
    await u.click(agregar())

    expect(await screen.findByRole('alert')).toHaveTextContent('No hay stock suficiente')
    expect(screen.queryByText(/Producto agregado/)).not.toBeInTheDocument()
  })

  it('un producto que no existe muestra el error en vez de la ficha', async () => {
    api.catalogoApi.producto.mockRejectedValue(new Error('Producto no encontrado'))
    montarApp('/producto/999')

    expect(await screen.findByRole('alert')).toHaveTextContent('Producto no encontrado')
    expect(screen.queryByRole('button', { name: 'Agregar al carrito' })).not.toBeInTheDocument()
  })

  describe('productos relacionados', () => {
    it('son de la misma categoría, sin el producto actual, sin inactivos y como máximo 4', async () => {
      api.catalogoApi.productos.mockResolvedValue([
        PINCEL,
        producto(6, { nombre: 'Relacionado A' }),
        producto(7, { nombre: 'Relacionado B' }),
        producto(8, { nombre: 'Inactivo', activo: false }),
        producto(9, { nombre: 'Relacionado C' }),
        producto(10, { nombre: 'Relacionado D' }),
        producto(11, { nombre: 'Relacionado E (el quinto sobra)' }),
      ])
      montarApp('/producto/5')
      const seccion = await screen.findByRole('region', { name: 'Productos relacionados' })

      expect(api.catalogoApi.productos).toHaveBeenCalledWith(1)
      const nombres = within(seccion).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
      expect(nombres).toEqual(['Relacionado A', 'Relacionado B', 'Relacionado C', 'Relacionado D'])
    })

    it('si no hay otros productos de la categoría no se muestra la sección', async () => {
      montarApp('/producto/5')
      await screen.findByRole('heading', { level: 1 })

      expect(screen.queryByRole('region', { name: 'Productos relacionados' })).not.toBeInTheDocument()
    })
  })
})
