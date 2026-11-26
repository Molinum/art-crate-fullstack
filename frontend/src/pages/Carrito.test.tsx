import { screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api, reiniciarApi } from '../test/api'
import { carrito, cliente, montarApp, pedido } from '../test/app'

vi.mock('../services/artcrate.service', async (original) =>
  (await import('../test/api')).conApiFalsa(await original<typeof import('../services/artcrate.service')>()))

const LAPIZ = { productoId: 1, nombre: 'Lápiz grafito', precioUnitario: 3000, cantidad: 2 }
const PINCEL = { productoId: 2, nombre: 'Pincel redondo', precioUnitario: 4500, cantidad: 1 }

// El carrito de la tienda: 2 lápices ($6.000) + 1 pincel ($4.500) = $10.500, 3 unidades
const cargado = () => carrito([LAPIZ, PINCEL])
const fila = (nombre: string) => screen.getByRole('row', { name: new RegExp(nombre) })

describe('Carrito', () => {
  beforeEach(() => {
    reiniciarApi()
    api.carritoApi.ver.mockResolvedValue(cargado())
  })

  it('sin sesión pide ingresar y no consulta el carrito', () => {
    montarApp('/carrito')
    expect(screen.getByRole('link', { name: 'ingresa a tu cuenta' })).toHaveAttribute('href', '/login')
    expect(api.carritoApi.ver).not.toHaveBeenCalled()
  })

  it('un carrito vacío ofrece volver al catálogo', async () => {
    api.carritoApi.ver.mockResolvedValue(carrito([]))
    montarApp('/carrito', cliente)

    expect(await screen.findByText('Tu carrito está vacío')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver catálogo' })).toHaveAttribute('href', '/catalogo')
    expect(screen.queryByText('Datos de despacho')).not.toBeInTheDocument()
  })

  it('muestra cada producto con su subtotal, el total y el contador del menú', async () => {
    montarApp('/carrito', cliente)

    expect(within(await screen.findByRole('row', { name: /Lápiz grafito/ })).getByText('$6.000')).toBeInTheDocument()
    expect(within(fila('Pincel redondo')).getAllByText('$4.500')).toHaveLength(2) // con 1 unidad, precio y subtotal coinciden
    expect(within(screen.getByRole('row', { name: /Total/ })).getByText('$10.500')).toBeInTheDocument()
    expect(screen.getByLabelText('3 productos en el carrito')).toBeInTheDocument() // unidades, no líneas
  })

  it('aumentar la cantidad usa la respuesta del servidor para el subtotal, el total y el contador', async () => {
    api.carritoApi.cambiarCantidad.mockResolvedValue(carrito([{ ...LAPIZ, cantidad: 3 }, PINCEL]))
    const u = montarApp('/carrito', cliente)
    await u.click(await screen.findByRole('button', { name: 'Aumentar cantidad de Lápiz grafito' }))

    expect(api.carritoApi.cambiarCantidad).toHaveBeenCalledWith(cliente.id, 1, 3)
    await waitFor(() => expect(within(fila('Lápiz grafito')).getByText('$9.000')).toBeInTheDocument())
    expect(within(screen.getByRole('row', { name: /Total/ })).getByText('$13.500')).toBeInTheDocument()
    expect(screen.getByLabelText('4 productos en el carrito')).toBeInTheDocument()
  })

  it('con una sola unidad no se puede disminuir más (para eso está "Quitar")', async () => {
    montarApp('/carrito', cliente)
    await screen.findByRole('row', { name: /Pincel redondo/ })

    expect(screen.getByRole('button', { name: 'Disminuir cantidad de Pincel redondo' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Disminuir cantidad de Lápiz grafito' })).toBeEnabled()
  })

  it('si no hay stock suficiente muestra el motivo y la cantidad no cambia', async () => {
    api.carritoApi.cambiarCantidad.mockRejectedValue(new Error('Stock insuficiente: quedan 2 unidades'))
    const u = montarApp('/carrito', cliente)
    await u.click(await screen.findByRole('button', { name: 'Aumentar cantidad de Lápiz grafito' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Stock insuficiente')
    expect(within(fila('Lápiz grafito')).getByText('$6.000')).toBeInTheDocument()
    expect(screen.getByLabelText('3 productos en el carrito')).toBeInTheDocument()
  })

  it('quitar un producto lo saca de la lista y recalcula el total y el contador', async () => {
    api.carritoApi.quitar.mockResolvedValue(carrito([PINCEL]))
    const u = montarApp('/carrito', cliente)
    await screen.findByRole('row', { name: /Lápiz grafito/ })
    await u.click(within(fila('Lápiz grafito')).getByRole('button', { name: 'Quitar' }))

    expect(api.carritoApi.quitar).toHaveBeenCalledWith(cliente.id, 1)
    await waitFor(() => expect(screen.queryByRole('row', { name: /Lápiz grafito/ })).not.toBeInTheDocument())
    expect(within(screen.getByRole('row', { name: /Total/ })).getByText('$4.500')).toBeInTheDocument()
    expect(screen.getByLabelText('1 productos en el carrito')).toBeInTheDocument()
  })

  it('vaciar deja el carrito vacío y quita el contador del menú', async () => {
    api.carritoApi.vaciar.mockResolvedValue(undefined)
    const u = montarApp('/carrito', cliente)
    await u.click(await screen.findByRole('button', { name: 'Vaciar carrito' }))

    expect(await screen.findByText('Tu carrito está vacío')).toBeInTheDocument()
    expect(screen.queryByLabelText(/productos en el carrito/)).not.toBeInTheDocument()
  })

  describe('crear el pedido', () => {
    it('sin datos de despacho muestra los errores y no crea el pedido', async () => {
      const u = montarApp('/carrito', cliente)
      await u.click(await screen.findByRole('button', { name: 'Crear pedido' }))

      expect(screen.getByText(/dirección de despacho/)).toBeInTheDocument()
      expect(screen.getByText('Selecciona la región')).toBeInTheDocument()
      expect(api.pedidosApi.crear).not.toHaveBeenCalled()
    })

    it('una dirección demasiado corta no sirve', async () => {
      const u = montarApp('/carrito', cliente)
      await u.type(await screen.findByLabelText('Dirección'), 'abc')
      await u.selectOptions(screen.getByLabelText('Región'), 'Coquimbo')
      await u.selectOptions(screen.getByLabelText('Comuna'), 'La Serena')
      await u.click(screen.getByRole('button', { name: 'Crear pedido' }))

      expect(screen.getByText(/dirección de despacho/)).toBeInTheDocument()
      expect(api.pedidosApi.crear).not.toHaveBeenCalled()
    })

    it('región y comuna se prellenan con los datos del usuario', async () => {
      montarApp('/carrito', { ...cliente, region: 'Coquimbo', comuna: 'La Serena' })

      expect(await screen.findByLabelText('Región')).toHaveValue('Coquimbo')
      expect(screen.getByLabelText('Comuna')).toHaveValue('La Serena')
    })

    it('una región guardada que ya no existe en la lista no se prellena', async () => {
      montarApp('/carrito', { ...cliente, region: 'Región inventada', comuna: 'Nada' })

      expect(await screen.findByLabelText('Región')).toHaveValue('')
    })

    it('con datos válidos crea el pedido, vacía el contador y lleva al detalle para pagar', async () => {
      api.pedidosApi.crear.mockResolvedValue(pedido({ id: 77 }))
      api.pedidosApi.obtener.mockResolvedValue(pedido({ id: 77 }))
      api.pagosApi.delPedido.mockResolvedValue([])
      const u = montarApp('/carrito', cliente)
      await u.type(await screen.findByLabelText('Dirección'), 'Av. Siempre Viva 742')
      await u.selectOptions(screen.getByLabelText('Región'), 'Coquimbo')
      await u.selectOptions(screen.getByLabelText('Comuna'), 'La Serena')
      await u.click(screen.getByRole('button', { name: 'Crear pedido' }))

      await waitFor(() => expect(screen.getByTestId('ruta')).toHaveTextContent('/pedidos/77'))
      expect(api.pedidosApi.crear).toHaveBeenCalledWith({
        usuarioId: cliente.id, direccionDespacho: 'Av. Siempre Viva 742', region: 'Coquimbo', comuna: 'La Serena',
      })
      expect(screen.queryByLabelText(/productos en el carrito/)).not.toBeInTheDocument()
    })

    it('si el servidor rechaza el pedido muestra el motivo y permite reintentar', async () => {
      api.pedidosApi.crear.mockRejectedValue(new Error('Un producto se quedó sin stock'))
      const u = montarApp('/carrito', cliente)
      await u.type(await screen.findByLabelText('Dirección'), 'Av. Siempre Viva 742')
      await u.selectOptions(screen.getByLabelText('Región'), 'Coquimbo')
      await u.selectOptions(screen.getByLabelText('Comuna'), 'La Serena')
      await u.click(screen.getByRole('button', { name: 'Crear pedido' }))

      expect(await screen.findByText('Un producto se quedó sin stock')).toBeInTheDocument()
      expect(screen.getByTestId('ruta')).toHaveTextContent('/carrito')
      expect(screen.getByLabelText('3 productos en el carrito')).toBeInTheDocument() // el carrito no se tocó
    })
  })
})
