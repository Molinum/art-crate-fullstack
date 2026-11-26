import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api, reiniciarApi } from '../../test/api'
import { carrito, encargado, montarApp, producto } from '../../test/app'

vi.mock('../../services/artcrate.service', async (original) =>
  (await import('../../test/api')).conApiFalsa(await original<typeof import('../../services/artcrate.service')>()))

const CATEGORIAS = [{ id: 1, nombre: 'Acuarela', descripcion: '' }, { id: 2, nombre: 'Lápices', descripcion: '' }]
const IMAGEN = 'Usar la imagen sakura sketchbook 13x21'

type Usuario = ReturnType<typeof montarApp>

async function llenar(u: Usuario) {
  await u.type(screen.getByLabelText('SKU'), ' ART-900 ')
  await u.type(screen.getByLabelText('Nombre'), ' Pincel nuevo ')
  await u.type(screen.getByLabelText('Precio (CLP)'), '4990')
  await u.clear(screen.getByLabelText('Stock'))
  await u.type(screen.getByLabelText('Stock'), '7')
  await u.selectOptions(screen.getByLabelText('Categoría'), 'Lápices')
  await u.click(screen.getByRole('button', { name: IMAGEN }))
}
const guardar = () => screen.getByRole('button', { name: 'Guardar' })

describe('Formulario de producto', () => {
  beforeEach(() => {
    reiniciarApi()
    api.carritoApi.ver.mockResolvedValue(carrito([]))
    api.catalogoApi.categorias.mockResolvedValue(CATEGORIAS)
    // la lista de productos a la que vuelve el formulario al guardar
    api.catalogoApi.productos.mockResolvedValue([])
    api.inventarioApi.todos.mockResolvedValue([])
  })

  describe('producto nuevo', () => {
    it('enviar vacío marca los errores, lleva el foco al SKU y no guarda nada', async () => {
      const u = montarApp('/admin/productos/nuevo', encargado)
      await u.click(await screen.findByRole('button', { name: 'Guardar' }))

      expect(screen.getByText('El SKU es obligatorio')).toBeInTheDocument()
      expect(screen.getByText(/nombre es obligatorio/)).toBeInTheDocument()
      expect(screen.getByText('Ingresa un precio en pesos, mayor a 0')).toBeInTheDocument()
      expect(screen.getByText('Selecciona una categoría')).toBeInTheDocument()
      expect(screen.getByText('Elige una imagen')).toBeInTheDocument()
      expect(screen.getByText('Revisa los campos marcados.')).toBeInTheDocument()
      expect(screen.getByLabelText('SKU')).toHaveFocus()
      expect(api.catalogoApi.crear).not.toHaveBeenCalled()
    })

    it.each([
      ['un precio con decimales', 'Precio (CLP)', '10.5', 'Ingresa un precio en pesos, mayor a 0'],
      ['un precio de cero', 'Precio (CLP)', '0', 'Ingresa un precio en pesos, mayor a 0'],
      ['un stock negativo', 'Stock', '-3', 'Debe ser un número entero de 0 o más'],
      ['un stock con decimales', 'Stock', '2.5', 'Debe ser un número entero de 0 o más'],
    ])('rechaza %s', async (_caso, campo, valor, mensaje) => {
      const u = montarApp('/admin/productos/nuevo', encargado)
      await screen.findByRole('button', { name: 'Guardar' })
      await u.clear(screen.getByLabelText(campo))
      await u.type(screen.getByLabelText(campo), valor)
      await u.click(guardar())

      expect(screen.getByText(mensaje)).toBeInTheDocument()
      expect(api.catalogoApi.crear).not.toHaveBeenCalled()
    })

    it('elegir una imagen la marca y muestra la vista previa', async () => {
      const u = montarApp('/admin/productos/nuevo', encargado)
      expect(await screen.findByText('Sin imagen elegida')).toBeInTheDocument()
      await u.click(screen.getByRole('button', { name: IMAGEN }))

      expect(screen.getByRole('button', { name: IMAGEN })).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByAltText('Vista previa de la imagen del producto')).toHaveAttribute('src', '/assets/img/productos/sakura-sketchbook-13x21.webp')
    })

    it('guarda el producto, fija su stock y vuelve a la lista con el aviso', async () => {
      api.catalogoApi.crear.mockResolvedValue(producto(50))
      api.inventarioApi.fijar.mockResolvedValue({ productoId: 50, cantidad: 7 })
      const u = montarApp('/admin/productos/nuevo', encargado)
      await screen.findByRole('button', { name: 'Guardar' })
      await llenar(u)
      await u.click(guardar())

      await waitFor(() => expect(screen.getByTestId('ruta')).toHaveTextContent(/^\/admin\/productos$/))
      expect(api.catalogoApi.crear).toHaveBeenCalledWith(expect.objectContaining({
        sku: 'ART-900', nombre: 'Pincel nuevo', precio: 4990, categoriaId: 2, activo: true,
        imagenUrl: 'assets/img/productos/sakura-sketchbook-13x21.webp',
      }))
      expect(api.inventarioApi.fijar).toHaveBeenCalledWith(50, 7)
      expect(await screen.findByText('"Pincel nuevo" se creó correctamente.')).toBeInTheDocument()
    })

    it('si el servidor rechaza el producto (SKU repetido) muestra el motivo y no toca el stock', async () => {
      api.catalogoApi.crear.mockRejectedValue(new Error('Ya existe un producto con ese SKU'))
      const u = montarApp('/admin/productos/nuevo', encargado)
      await screen.findByRole('button', { name: 'Guardar' })
      await llenar(u)
      await u.click(guardar())

      expect(await screen.findByText('Ya existe un producto con ese SKU')).toBeInTheDocument()
      expect(api.inventarioApi.fijar).not.toHaveBeenCalled()
      expect(screen.getByTestId('ruta')).toHaveTextContent('/admin/productos/nuevo')
      expect(guardar()).toBeEnabled()
    })

    it('si el producto se guarda pero falla el stock, pasa a editar ese producto y reintentar NO crea otro', async () => {
      api.catalogoApi.crear.mockResolvedValue(producto(50, { sku: 'ART-900' }))
      api.inventarioApi.fijar.mockRejectedValueOnce(new Error('Inventario no disponible')).mockResolvedValue({ productoId: 50, cantidad: 7 })
      api.catalogoApi.producto.mockResolvedValue(producto(50, { sku: 'ART-900', nombre: 'Pincel nuevo', categoriaId: 2 }))
      api.catalogoApi.actualizar.mockResolvedValue(producto(50))
      const u = montarApp('/admin/productos/nuevo', encargado)
      await screen.findByRole('button', { name: 'Guardar' })
      await llenar(u)
      await u.click(guardar())

      await waitFor(() => expect(screen.getByTestId('ruta')).toHaveTextContent('/admin/productos/50'))
      expect(await screen.findByText(/El producto se guardó, pero no el stock: Inventario no disponible/)).toBeInTheDocument()
      expect(await screen.findByLabelText('Stock')).toHaveValue(7) // conserva lo que había escrito, no el 0 del inventario

      await u.click(guardar())
      await waitFor(() => expect(screen.getByTestId('ruta')).toHaveTextContent(/^\/admin\/productos$/))
      expect(api.catalogoApi.crear).toHaveBeenCalledTimes(1)
      expect(api.catalogoApi.actualizar).toHaveBeenCalledWith(50, expect.objectContaining({ sku: 'ART-900' }))
      expect(api.inventarioApi.fijar).toHaveBeenLastCalledWith(50, 7)
    })
  })

  describe('editar un producto', () => {
    beforeEach(() => {
      api.catalogoApi.producto.mockResolvedValue(producto(8, {
        sku: 'ART-8', nombre: 'Acuarela 12', precio: 15990, marca: 'Winsor', contenido: '12 colores', categoriaId: 1, activo: false,
      }))
      api.inventarioApi.todos.mockResolvedValue([{ productoId: 3, cantidad: 99 }, { productoId: 8, cantidad: 14 }])
    })

    it('carga los datos del producto y el stock que le corresponde', async () => {
      montarApp('/admin/productos/8', encargado)

      expect(await screen.findByRole('heading', { name: 'Editar producto' })).toBeInTheDocument()
      expect(screen.getByLabelText('SKU')).toHaveValue('ART-8')
      expect(screen.getByLabelText('Nombre')).toHaveValue('Acuarela 12')
      expect(screen.getByLabelText('Precio (CLP)')).toHaveValue(15990)
      expect(screen.getByLabelText('Stock')).toHaveValue(14) // el del producto 8, no el de otro
      expect(screen.getByLabelText('Categoría')).toHaveValue('1')
      expect(screen.getByLabelText(/Producto activo/)).not.toBeChecked()
    })

    it('guardar actualiza ese producto (no crea uno nuevo) con los cambios', async () => {
      api.catalogoApi.actualizar.mockResolvedValue(producto(8))
      api.inventarioApi.fijar.mockResolvedValue({ productoId: 8, cantidad: 30 })
      const u = montarApp('/admin/productos/8', encargado)
      await screen.findByRole('heading', { name: 'Editar producto' })
      await u.clear(screen.getByLabelText('Stock'))
      await u.type(screen.getByLabelText('Stock'), '30')
      await u.click(screen.getByLabelText(/Producto activo/))
      await u.click(guardar())

      await waitFor(() => expect(api.catalogoApi.actualizar).toHaveBeenCalledWith(8, expect.objectContaining({ nombre: 'Acuarela 12', precio: 15990, activo: true })))
      expect(api.catalogoApi.crear).not.toHaveBeenCalled()
      expect(api.inventarioApi.fijar).toHaveBeenCalledWith(8, 30)
      expect(await screen.findByText('"Acuarela 12" se actualizó correctamente.')).toBeInTheDocument()
    })

    it('si no se puede cargar el producto muestra el error', async () => {
      api.catalogoApi.producto.mockRejectedValue(new Error('Producto no encontrado'))
      montarApp('/admin/productos/999', encargado)

      expect(await screen.findByRole('alert')).toHaveTextContent('Producto no encontrado')
    })
  })
})
