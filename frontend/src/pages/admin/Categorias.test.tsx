import { screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api, reiniciarApi } from '../../test/api'
import { carrito, encargado, montarApp, producto } from '../../test/app'

vi.mock('../../services/artcrate.service', async (original) =>
  (await import('../../test/api')).conApiFalsa(await original<typeof import('../../services/artcrate.service')>()))

const CATEGORIAS = [
  { id: 1, nombre: 'Acuarela', descripcion: 'Pinturas al agua' },
  { id: 2, nombre: 'Lápices', descripcion: '' },
  { id: 3, nombre: 'Vacía', descripcion: 'Sin productos' },
]
const PRODUCTOS = [
  producto(1, { categoriaId: 1 }), producto(2, { categoriaId: 1, activo: false }), producto(3, { categoriaId: 2 }),
]
const fila = (nombre: string) => within(screen.getByRole('row', { name: new RegExp(nombre) }))

async function abrir() {
  const u = montarApp('/admin/categorias', encargado)
  await screen.findByRole('row', { name: /Acuarela/ })
  return u
}

describe('Categorías del panel', () => {
  beforeEach(() => {
    reiniciarApi()
    api.carritoApi.ver.mockResolvedValue(carrito([]))
    api.catalogoApi.categorias.mockResolvedValue(CATEGORIAS)
    api.catalogoApi.productos.mockResolvedValue(PRODUCTOS)
  })

  it('cuenta los productos activos de cada categoría sobre el total', async () => {
    await abrir()

    expect(fila('Acuarela').getByText('1')).toBeInTheDocument()
    expect(fila('Acuarela').getByText('de 2')).toBeInTheDocument() // 1 activo de 2
    expect(fila('Lápices').getByText('de 1')).toBeInTheDocument()
    expect(fila('Lápices').getByText('—')).toBeInTheDocument() // sin descripción
  })

  it('solo se puede eliminar una categoría sin productos', async () => {
    await abrir()

    expect(fila('Acuarela').getByText('Con productos')).toBeInTheDocument()
    expect(fila('Acuarela').queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument()
    expect(fila('Vacía').getByRole('button', { name: 'Eliminar' })).toBeInTheDocument()
  })

  it('eliminar pide confirmación y recién entonces borra', async () => {
    api.catalogoApi.eliminarCategoria.mockResolvedValue(undefined)
    const u = await abrir()
    await u.click(fila('Vacía').getByRole('button', { name: 'Eliminar' }))

    const dialogo = await screen.findByRole('dialog')
    expect(dialogo).toHaveTextContent('Se eliminará "Vacía"')
    expect(api.catalogoApi.eliminarCategoria).not.toHaveBeenCalled()
    await u.click(within(dialogo).getByRole('button', { name: 'Eliminar' }))

    await waitFor(() => expect(api.catalogoApi.eliminarCategoria).toHaveBeenCalledWith(3))
    expect(await screen.findByText('La categoría "Vacía" se eliminó.')).toBeInTheDocument()
  })

  it('si se cancela la confirmación no se elimina nada', async () => {
    const u = await abrir()
    await u.click(fila('Vacía').getByRole('button', { name: 'Eliminar' }))
    await u.click(await screen.findByRole('button', { name: 'Volver' }))

    expect(api.catalogoApi.eliminarCategoria).not.toHaveBeenCalled()
  })

  it('el nombre es obligatorio para crear una categoría', async () => {
    const u = await abrir()
    await u.click(screen.getByRole('button', { name: 'Nueva categoría' }))
    await u.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(screen.getByText('El nombre de la categoría es obligatorio')).toBeInTheDocument()
    expect(api.catalogoApi.crearCategoria).not.toHaveBeenCalled()
  })

  it('crea la categoría con el nombre y la descripción sin espacios sobrantes', async () => {
    api.catalogoApi.crearCategoria.mockResolvedValue({ id: 9, nombre: 'Óleo', descripcion: 'Pinturas al óleo' })
    const u = await abrir()
    await u.click(screen.getByRole('button', { name: 'Nueva categoría' }))
    await u.type(screen.getByLabelText('Nombre'), '  Óleo ')
    await u.type(screen.getByLabelText('Descripción'), ' Pinturas al óleo ')
    await u.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(api.catalogoApi.crearCategoria).toHaveBeenCalledWith('Óleo', 'Pinturas al óleo'))
    expect(await screen.findByText('La categoría "Óleo" se creó.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Nueva categoría' })).not.toBeInTheDocument() // el formulario se cierra
    await waitFor(() => expect(api.catalogoApi.categorias).toHaveBeenCalledTimes(2)) // y la lista se recarga
  })

  it('editar abre el formulario con los datos actuales y actualiza esa categoría', async () => {
    api.catalogoApi.actualizarCategoria.mockResolvedValue(CATEGORIAS[0])
    const u = await abrir()
    await u.click(fila('Acuarela').getByRole('button', { name: 'Editar' }))

    expect(screen.getByRole('heading', { name: 'Editar categoría' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre')).toHaveValue('Acuarela')
    expect(screen.getByLabelText('Descripción')).toHaveValue('Pinturas al agua')
    await u.clear(screen.getByLabelText('Nombre'))
    await u.type(screen.getByLabelText('Nombre'), 'Acuarelas')
    await u.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(api.catalogoApi.actualizarCategoria).toHaveBeenCalledWith(1, 'Acuarelas', 'Pinturas al agua'))
    expect(await screen.findByText('La categoría "Acuarelas" se actualizó.')).toBeInTheDocument()
  })

  it('si el servidor rechaza el guardado (nombre repetido) muestra el motivo y mantiene el formulario', async () => {
    api.catalogoApi.crearCategoria.mockRejectedValue(new Error('Ya existe una categoría con ese nombre'))
    const u = await abrir()
    await u.click(screen.getByRole('button', { name: 'Nueva categoría' }))
    await u.type(screen.getByLabelText('Nombre'), 'Acuarela')
    await u.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Ya existe una categoría con ese nombre')
    expect(screen.getByLabelText('Nombre')).toHaveValue('Acuarela')
  })

  it('Cancelar cierra el formulario sin guardar', async () => {
    const u = await abrir()
    await u.click(screen.getByRole('button', { name: 'Nueva categoría' }))
    await u.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('heading', { name: 'Nueva categoría' })).not.toBeInTheDocument()
    expect(api.catalogoApi.crearCategoria).not.toHaveBeenCalled()
  })
})
