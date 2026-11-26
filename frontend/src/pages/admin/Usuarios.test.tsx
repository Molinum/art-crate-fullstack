import { screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api, reiniciarApi } from '../../test/api'
import { admin, carrito, cliente, encargado, montarApp, pedido } from '../../test/app'
import type { Usuario } from '../../types'

vi.mock('../../services/artcrate.service', async (original) =>
  (await import('../../test/api')).conApiFalsa(await original<typeof import('../../services/artcrate.service')>()))

const inactiva: Usuario = { ...cliente, id: 4, nombre: 'Inés', apellido: 'Vera', correo: 'ines@artcrate.cl', activo: false }
const fila = (nombre: string) => screen.getByRole('row', { name: new RegExp(nombre) })

async function abrir() {
  const u = montarApp('/admin/usuarios', admin)
  await screen.findByRole('row', { name: /Camila/ })
  return u
}

describe('Administración de usuarios', () => {
  beforeEach(() => {
    reiniciarApi()
    api.carritoApi.ver.mockResolvedValue(carrito([]))
    api.usuariosApi.todos.mockResolvedValue([admin, encargado, cliente, inactiva])
    api.pedidosApi.todos.mockResolvedValue([pedido({ id: 1 }), pedido({ id: 2 }), pedido({ id: 3, usuarioId: encargado.id })])
  })

  it('cada fila cuenta los pedidos de esa persona', async () => {
    await abrir()

    expect(within(fila('Camila')).getByRole('cell', { name: '2' })).toBeInTheDocument()
    expect(within(fila('Eduardo')).getByRole('cell', { name: '1' })).toBeInTheDocument()
    expect(within(fila('Ana')).getByRole('cell', { name: '0' })).toBeInTheDocument()
  })

  it('la propia cuenta del administrador no se puede editar: sin selector de rol ni botón de desactivar', async () => {
    await abrir()
    const mia = within(fila('Ana'))

    expect(mia.getByText('Tú')).toBeInTheDocument()
    expect(mia.queryByRole('combobox')).not.toBeInTheDocument()
    expect(mia.queryByRole('button', { name: /Desactivar/ })).not.toBeInTheDocument()
    expect(mia.getByText('Tu cuenta no se edita aquí')).toBeInTheDocument()
    expect(within(fila('Camila')).getByRole('combobox', { name: 'Rol de Camila Rojas' })).toBeInTheDocument()
  })

  it('los filtros cuentan a cada grupo y "Desactivados" muestra solo a quien no puede entrar', async () => {
    const u = await abrir()

    for (const [texto, cuantos] of [['Todos', 4], ['Administradores', 1], ['Encargados', 1], ['Clientes', 2], ['Desactivados', 1]] as const) {
      expect(screen.getByRole('button', { name: `${texto} (${cuantos})` })).toBeInTheDocument()
    }
    await u.click(screen.getByRole('button', { name: 'Desactivados (1)' }))
    expect(screen.getByRole('row', { name: /Inés/ })).toBeInTheDocument()
    expect(screen.queryByRole('row', { name: /Camila/ })).not.toBeInTheDocument()
    expect(screen.getByTestId('ruta')).toHaveTextContent('?filtro=INACTIVOS')
  })

  it('se busca por nombre, apellido o correo sin distinguir mayúsculas', async () => {
    const u = await abrir()
    await u.type(screen.getByRole('searchbox'), 'EDUARDO@')

    expect(screen.getByRole('row', { name: /Eduardo/ })).toBeInTheDocument()
    expect(screen.queryByRole('row', { name: /Camila/ })).not.toBeInTheDocument()

    await u.clear(screen.getByRole('searchbox'))
    await u.type(screen.getByRole('searchbox'), 'nadie')
    expect(screen.getByText('No hay usuarios en esta vista.')).toBeInTheDocument()
  })

  describe('cambiar el rol', () => {
    it('explica qué podrá hacer la persona antes de aplicar el cambio', async () => {
      const u = await abrir()
      await u.selectOptions(screen.getByRole('combobox', { name: 'Rol de Camila Rojas' }), 'ENCARGADO')

      const dialogo = await screen.findByRole('dialog')
      expect(dialogo).toHaveTextContent('camila@artcrate.cl')
      expect(dialogo).toHaveTextContent('pasará a ser encargado de tienda')
      expect(dialogo).toHaveTextContent('pero no usuarios')
      expect(api.usuariosApi.actualizar).not.toHaveBeenCalled() // todavía no se aplicó
    })

    it('si el administrador se arrepiente ("Volver") no se cambia nada', async () => {
      const u = await abrir()
      await u.selectOptions(screen.getByRole('combobox', { name: 'Rol de Camila Rojas' }), 'ADMIN')
      await u.click(await screen.findByRole('button', { name: 'Volver' }))

      expect(api.usuariosApi.actualizar).not.toHaveBeenCalled()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('al confirmar envía el nuevo rol, avisa y vuelve a cargar la lista', async () => {
      api.usuariosApi.actualizar.mockResolvedValue({ ...cliente, rol: 'ENCARGADO' })
      const u = await abrir()
      await u.selectOptions(screen.getByRole('combobox', { name: 'Rol de Camila Rojas' }), 'ENCARGADO')
      await u.click(await screen.findByRole('button', { name: 'Cambiar rol' }))

      await waitFor(() => expect(api.usuariosApi.actualizar).toHaveBeenCalledWith(cliente, { rol: 'ENCARGADO' }))
      expect(await screen.findByText('Camila ahora es encargado de tienda.')).toBeInTheDocument()
      await waitFor(() => expect(api.usuariosApi.todos).toHaveBeenCalledTimes(2))
    })

    it('si el servidor lo rechaza muestra el motivo', async () => {
      api.usuariosApi.actualizar.mockRejectedValue(new Error('No puedes quitar al último administrador'))
      const u = await abrir()
      await u.selectOptions(screen.getByRole('combobox', { name: 'Rol de Eduardo Soto' }), 'CLIENTE')
      await u.click(await screen.findByRole('button', { name: 'Cambiar rol' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('No puedes quitar al último administrador')
    })
  })

  describe('activar y desactivar', () => {
    it('desactivar pide confirmación y, al aceptar, manda activo = false', async () => {
      api.usuariosApi.actualizar.mockResolvedValue({ ...cliente, activo: false })
      const u = await abrir()
      await u.click(within(fila('Camila')).getByRole('button', { name: 'Desactivar' }))

      const dialogo = await screen.findByRole('dialog')
      expect(dialogo).toHaveTextContent('Camila no podrá iniciar sesión')
      expect(api.usuariosApi.actualizar).not.toHaveBeenCalled()
      await u.click(within(dialogo).getByRole('button', { name: 'Desactivar' }))

      await waitFor(() => expect(api.usuariosApi.actualizar).toHaveBeenCalledWith(cliente, { activo: false }))
      expect(await screen.findByText('Camila quedó desactivado.')).toBeInTheDocument()
    })

    it('activar a alguien desactivado se hace directo, sin confirmación', async () => {
      api.usuariosApi.actualizar.mockResolvedValue({ ...inactiva, activo: true })
      const u = await abrir()
      await u.click(within(fila('Inés')).getByRole('button', { name: 'Activar' }))

      await waitFor(() => expect(api.usuariosApi.actualizar).toHaveBeenCalledWith(inactiva, { activo: true }))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(await screen.findByText('Inés quedó activo.')).toBeInTheDocument()
    })
  })
})
