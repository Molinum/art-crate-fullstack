import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api, reiniciarApi } from '../test/api'
import { admin, carrito, cliente, encargado, montarApp } from '../test/app'

vi.mock('../services/artcrate.service', async (original) =>
  (await import('../test/api')).conApiFalsa(await original<typeof import('../services/artcrate.service')>()))
const login = () => api.usuariosApi.login

async function ingresar(usuario: ReturnType<typeof montarApp>, correo: string, clave: string) {
  if (correo) await usuario.type(screen.getByLabelText('Correo'), correo)
  if (clave) await usuario.type(screen.getByLabelText('Contraseña'), clave)
  await usuario.click(screen.getByRole('button', { name: 'Ingresar' }))
}

describe('Login', () => {
  beforeEach(() => {
    reiniciarApi()
    api.carritoApi.ver.mockResolvedValue(carrito([]))
  })

  it('un correo sin formato válido se rechaza sin llamar al servidor', async () => {
    const u = montarApp('/login')
    await ingresar(u, 'camila-sin-arroba', 'Clave1234')

    expect(screen.getByRole('alert')).toHaveTextContent('formato válido')
    expect(login()).not.toHaveBeenCalled()
  })

  it('sin contraseña no se intenta el ingreso', async () => {
    const u = montarApp('/login')
    await ingresar(u, 'camila@artcrate.cl', '')

    expect(screen.getByRole('alert')).toHaveTextContent('contraseña es obligatoria')
    expect(login()).not.toHaveBeenCalled()
  })

  it('un cliente entra a la tienda y queda guardada su sesión con el token', async () => {
    login().mockResolvedValue({ token: 'jwt-cliente', usuario: cliente })
    const u = montarApp('/login')
    await ingresar(u, 'camila@artcrate.cl', 'Clave1234')

    await waitFor(() => expect(screen.getByTestId('ruta')).toHaveTextContent(/^\/$/))
    expect(login()).toHaveBeenCalledWith('camila@artcrate.cl', 'Clave1234')
    expect(localStorage.getItem('artcrate.token')).toBe('jwt-cliente')
    expect(screen.getByRole('button', { name: /Salir \(Camila\)/ })).toBeInTheDocument()
  })

  it.each([
    ['administrador', admin],
    ['encargado', encargado],
  ])('el %s entra directo al panel de administración', async (_nombre, personal) => {
    login().mockResolvedValue({ token: 'jwt', usuario: personal })
    const u = montarApp('/login')
    await ingresar(u, personal.correo, 'Clave1234')

    await waitFor(() => expect(screen.getByTestId('ruta')).toHaveTextContent('/admin'))
  })

  it('si las credenciales son incorrectas muestra el mensaje del servidor y no inicia sesión', async () => {
    login().mockRejectedValue(new Error('Correo o contraseña incorrectos'))
    const u = montarApp('/login')
    await ingresar(u, 'camila@artcrate.cl', 'mala')

    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos')
    expect(screen.getByTestId('ruta')).toHaveTextContent('/login')
    expect(localStorage.getItem('artcrate.token')).toBeNull()
    expect(screen.getByRole('link', { name: 'Ingresar' })).toBeInTheDocument() // el menú sigue mostrando "Ingresar"
  })

  it('el botón Mostrar/Ocultar cambia la visibilidad de la contraseña', async () => {
    const u = montarApp('/login')
    const campo = screen.getByLabelText('Contraseña')
    expect(campo).toHaveAttribute('type', 'password')

    await u.click(screen.getByRole('button', { name: 'Mostrar' }))
    expect(campo).toHaveAttribute('type', 'text')
    await u.click(screen.getByRole('button', { name: 'Ocultar' }))
    expect(campo).toHaveAttribute('type', 'password')
  })
})
