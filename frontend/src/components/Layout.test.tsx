import { screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api, reiniciarApi } from '../test/api'
import { admin, carrito, cliente, encargado, montarApp } from '../test/app'

vi.mock('../services/artcrate.service', async (original) =>
  (await import('../test/api')).conApiFalsa(await original<typeof import('../services/artcrate.service')>()))

const menu = () => within(screen.getByRole('navigation', { name: 'Navegación principal' }))
const menuAdmin = () => within(screen.getByRole('navigation', { name: 'Navegación de administración' }))

describe('Menú de la tienda según quién entró', () => {
  beforeEach(() => {
    reiniciarApi()
    api.carritoApi.ver.mockResolvedValue(carrito([]))
    api.catalogoApi.productos.mockResolvedValue([])
    api.catalogoApi.categorias.mockResolvedValue([])
    api.inventarioApi.todos.mockResolvedValue([])
  })

  it('un visitante ve Ingresar y Registrarme, y nada de pedidos ni administración', () => {
    montarApp('/catalogo')

    expect(menu().getByRole('link', { name: 'Ingresar' })).toBeInTheDocument()
    expect(menu().getByRole('link', { name: 'Registrarme' })).toBeInTheDocument()
    expect(menu().queryByRole('link', { name: 'Mis pedidos' })).not.toBeInTheDocument()
    expect(menu().queryByRole('link', { name: 'Administración' })).not.toBeInTheDocument()
    expect(api.carritoApi.ver).not.toHaveBeenCalled()
  })

  it('un cliente ve sus pedidos y su nombre, pero no la administración', () => {
    montarApp('/catalogo', cliente)

    expect(menu().getByRole('link', { name: 'Mis pedidos' })).toBeInTheDocument()
    expect(menu().getByRole('button', { name: 'Salir (Camila)' })).toBeInTheDocument()
    expect(menu().queryByRole('link', { name: 'Administración' })).not.toBeInTheDocument()
    expect(menu().queryByRole('link', { name: 'Ingresar' })).not.toBeInTheDocument()
  })

  it.each([['encargado', encargado], ['administrador', admin]])('el %s ve el enlace a Administración', (_n, personal) => {
    montarApp('/catalogo', personal)

    expect(menu().getByRole('link', { name: 'Administración' })).toHaveAttribute('href', '/admin')
  })

  it('el contador del carrito muestra las unidades y desaparece cuando es 0', async () => {
    api.carritoApi.ver.mockResolvedValue(carrito([{ productoId: 1, nombre: 'A', precioUnitario: 100, cantidad: 2 }, { productoId: 2, nombre: 'B', precioUnitario: 100, cantidad: 3 }]))
    montarApp('/catalogo', cliente)
    expect(await screen.findByLabelText('5 productos en el carrito')).toBeInTheDocument()
  })

  it('sin productos en el carrito no se dibuja ningún contador', async () => {
    montarApp('/catalogo', cliente)
    await waitFor(() => expect(api.carritoApi.ver).toHaveBeenCalled())

    expect(screen.queryByLabelText(/productos en el carrito/)).not.toBeInTheDocument()
  })

  it('Salir cierra la sesión, borra el token y vuelve al inicio como visitante', async () => {
    const u = montarApp('/pedidos', cliente)
    await u.click(menu().getByRole('button', { name: 'Salir (Camila)' }))

    expect(screen.getByTestId('ruta')).toHaveTextContent(/^\/$/)
    expect(localStorage.getItem('artcrate.token')).toBeNull()
    expect(localStorage.getItem('artcrate.usuario')).toBeNull()
    expect(menu().getByRole('link', { name: 'Ingresar' })).toBeInTheDocument()
  })
})

describe('Acceso al panel de administración', () => {
  beforeEach(() => {
    reiniciarApi()
    api.carritoApi.ver.mockResolvedValue(carrito([]))
    api.catalogoApi.productos.mockResolvedValue([])
    api.inventarioApi.todos.mockResolvedValue([])
    api.pedidosApi.todos.mockResolvedValue([])
    api.usuariosApi.todos.mockResolvedValue([admin, encargado, cliente])
    api.catalogoApi.categorias.mockResolvedValue([])
  })

  it('un visitante que abre /admin es enviado a iniciar sesión', () => {
    montarApp('/admin/productos')

    expect(screen.getByTestId('ruta')).toHaveTextContent('/login')
    expect(screen.queryByRole('heading', { name: 'Productos' })).not.toBeInTheDocument()
    expect(api.catalogoApi.productos).not.toHaveBeenCalled()
  })

  it('un cliente que abre /admin vuelve a la tienda sin cargar datos del panel', () => {
    montarApp('/admin/pedidos', cliente)

    expect(screen.getByTestId('ruta')).toHaveTextContent(/^\/$/)
    expect(api.pedidosApi.todos).not.toHaveBeenCalled()
  })

  it('el encargado ve el panel sin el enlace a Usuarios', async () => {
    montarApp('/admin', encargado)

    expect(await screen.findByRole('heading', { name: 'Panel de administración' })).toBeInTheDocument()
    for (const enlace of ['Productos', 'Categorías', 'Pedidos']) {
      expect(menuAdmin().getByRole('link', { name: enlace })).toBeInTheDocument()
    }
    expect(menuAdmin().queryByRole('link', { name: 'Usuarios' })).not.toBeInTheDocument()
  })

  it('si el encargado escribe /admin/usuarios en la barra, vuelve al panel y no se piden los usuarios', async () => {
    montarApp('/admin/usuarios', encargado)

    expect(screen.getByTestId('ruta')).toHaveTextContent(/^\/admin$/)
    expect(screen.queryByRole('heading', { name: 'Usuarios' })).not.toBeInTheDocument()
    await screen.findByRole('heading', { name: 'Panel de administración' })
  })

  it('el administrador ve y puede abrir Usuarios', async () => {
    const u = montarApp('/admin', admin)
    await screen.findByRole('heading', { name: 'Panel de administración' })
    await u.click(menuAdmin().getByRole('link', { name: 'Usuarios' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Usuarios' })).toBeInTheDocument()
  })

  it('Salir desde el panel vuelve a la tienda sin pasar por el login', async () => {
    const u = montarApp('/admin', admin)
    await screen.findByRole('heading', { name: 'Panel de administración' })
    await u.click(menuAdmin().getByRole('button', { name: 'Salir (Ana)' }))

    expect(screen.getByTestId('ruta')).toHaveTextContent(/^\/$/)
    expect(localStorage.getItem('artcrate.token')).toBeNull()
  })
})
