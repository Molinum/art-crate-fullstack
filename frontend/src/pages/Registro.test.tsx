import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api, reiniciarApi } from '../test/api'
import { carrito, cliente, montarApp } from '../test/app'

vi.mock('../services/artcrate.service', async (original) =>
  (await import('../test/api')).conApiFalsa(await original<typeof import('../services/artcrate.service')>()))

type Usuario = ReturnType<typeof montarApp>

async function llenarValido(u: Usuario, extra: { telefono?: string } = {}) {
  await u.type(screen.getByLabelText('Nombre'), '  Camila ')
  await u.type(screen.getByLabelText('Apellido'), 'Rojas')
  await u.type(screen.getByLabelText('Correo electrónico'), 'camila@artcrate.cl')
  await u.type(screen.getByLabelText('Contraseña'), 'Clave1234')
  await u.type(screen.getByLabelText('Confirmar contraseña'), 'Clave1234')
  if (extra.telefono) await u.type(screen.getByLabelText('Teléfono (opcional)'), extra.telefono)
  await u.selectOptions(screen.getByLabelText('Región'), 'Coquimbo')
  await u.selectOptions(screen.getByLabelText('Comuna'), 'La Serena')
  await u.click(screen.getByLabelText('Acepto los términos y condiciones'))
}

const crear = () => screen.getByRole('button', { name: 'Crear cuenta' })

describe('Registro', () => {
  beforeEach(() => {
    reiniciarApi()
    api.carritoApi.ver.mockResolvedValue(carrito([]))
  })

  it('no muestra errores hasta que el usuario toca un campo o intenta enviar', () => {
    montarApp('/registro')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('al salir de un campo vacío muestra solo el error de ese campo', async () => {
    const u = montarApp('/registro')
    await u.click(screen.getByLabelText('Nombre'))
    await u.tab()

    expect(screen.getByText('Ingresa tu nombre')).toBeInTheDocument()
    expect(screen.queryByText('Ingresa tu apellido')).not.toBeInTheDocument()
  })

  it('enviar vacío muestra todos los errores, lleva el foco al primer campo y no llama al servidor', async () => {
    const u = montarApp('/registro')
    await u.click(crear())

    const errores = screen.getAllByRole('alert').map((a) => a.textContent)
    expect(errores).toEqual([
      'Ingresa tu nombre',
      'Ingresa tu apellido',
      'Ingresa un correo válido (ej: nombre@dominio.cl)',
      'La contraseña necesita: mínimo 8 caracteres, una letra mayúscula, un número',
      'Selecciona tu región',
      'Debes aceptar los términos y condiciones',
    ])
    expect(screen.getByLabelText('Nombre')).toHaveFocus()
    expect(api.usuariosApi.registro).not.toHaveBeenCalled()
  })

  it('la lista de requisitos de la contraseña se va marcando mientras se escribe', async () => {
    const u = montarApp('/registro')
    const clave = screen.getByLabelText('Contraseña')

    await u.type(clave, 'abc')
    expect(screen.getByText('○ Una letra mayúscula')).toBeInTheDocument()
    expect(screen.getByText('○ Mínimo 8 caracteres')).toBeInTheDocument()

    await u.type(clave, 'defgH1')
    expect(screen.getByText('✓ Una letra mayúscula')).toBeInTheDocument()
    expect(screen.getByText('✓ Un número')).toBeInTheDocument()
    expect(screen.getByText('✓ Mínimo 8 caracteres')).toBeInTheDocument()
  })

  it('una contraseña sin mayúscula ni número lo dice con las dos razones', async () => {
    const u = montarApp('/registro')
    await u.type(screen.getByLabelText('Contraseña'), 'abcdefgh')
    await u.tab()

    expect(screen.getByText(/necesita: una letra mayúscula, un número/)).toBeInTheDocument()
  })

  it('avisa si la confirmación no coincide', async () => {
    const u = montarApp('/registro')
    await u.type(screen.getByLabelText('Contraseña'), 'Clave1234')
    await u.type(screen.getByLabelText('Confirmar contraseña'), 'Clave9999')
    await u.tab()

    expect(screen.getByText('Las contraseñas no coinciden')).toBeInTheDocument()
  })

  it('el teléfono solo admite dígitos y hasta 8', async () => {
    const u = montarApp('/registro')
    await u.type(screen.getByLabelText('Teléfono (opcional)'), '12ab 3456-789')
    expect(screen.getByLabelText('Teléfono (opcional)')).toHaveValue('12345678')
  })

  it('un teléfono incompleto se rechaza al enviar', async () => {
    const u = montarApp('/registro')
    await u.type(screen.getByLabelText('Teléfono (opcional)'), '1234')
    await u.click(crear())

    expect(screen.getByText(/8 dígitos/)).toBeInTheDocument()
  })

  it('la comuna depende de la región: parte bloqueada y se borra al cambiar de región', async () => {
    const u = montarApp('/registro')
    expect(screen.getByLabelText('Comuna')).toBeDisabled()

    await u.selectOptions(screen.getByLabelText('Región'), 'Coquimbo')
    await u.selectOptions(screen.getByLabelText('Comuna'), 'La Serena')
    expect(screen.getByLabelText('Comuna')).toHaveValue('La Serena')

    await u.selectOptions(screen.getByLabelText('Región'), 'Atacama')
    expect(screen.getByLabelText('Comuna')).toHaveValue('')
    expect(screen.queryByRole('option', { name: 'La Serena' })).not.toBeInTheDocument()
  })

  it('con datos válidos registra, inicia sesión y entra a la tienda', async () => {
    api.usuariosApi.registro.mockResolvedValue({ ...cliente, region: 'Coquimbo' })
    api.usuariosApi.login.mockResolvedValue({ token: 'jwt-nuevo', usuario: { ...cliente, region: 'Coquimbo' } })
    const u = montarApp('/registro')
    await llenarValido(u, { telefono: '12345678' })
    await u.click(crear())

    await waitFor(() => expect(screen.getByTestId('ruta')).toHaveTextContent(/^\/$/))
    // se envía el nombre sin espacios sobrantes, el teléfono con +56 9 y NADA de la confirmación ni de los términos
    expect(api.usuariosApi.registro).toHaveBeenCalledWith({
      nombre: 'Camila', apellido: 'Rojas', correo: 'camila@artcrate.cl', password: 'Clave1234', telefono: '+56912345678', region: 'Coquimbo',
    })
    expect(api.usuariosApi.login).toHaveBeenCalledWith('camila@artcrate.cl', 'Clave1234')
    expect(localStorage.getItem('artcrate.token')).toBe('jwt-nuevo')
    // la comuna no la guarda el backend: queda en el navegador para prellenar el despacho
    expect(JSON.parse(localStorage.getItem('artcrate.usuario')!).comuna).toBe('La Serena')
  })

  it('sin teléfono no envía el campo', async () => {
    api.usuariosApi.registro.mockResolvedValue(cliente)
    api.usuariosApi.login.mockResolvedValue({ token: 't', usuario: cliente })
    const u = montarApp('/registro')
    await llenarValido(u)
    await u.click(crear())

    await waitFor(() => expect(api.usuariosApi.registro).toHaveBeenCalled())
    expect(api.usuariosApi.registro.mock.calls[0][0].telefono).toBeUndefined()
  })

  it('si el correo ya existe muestra el error del servidor, no inicia sesión y deja reintentar', async () => {
    api.usuariosApi.registro.mockRejectedValue(new Error('Ya existe una cuenta con ese correo'))
    const u = montarApp('/registro')
    await llenarValido(u)
    await u.click(crear())

    expect(await screen.findByText('Ya existe una cuenta con ese correo')).toBeInTheDocument()
    expect(api.usuariosApi.login).not.toHaveBeenCalled()
    expect(localStorage.getItem('artcrate.token')).toBeNull()
    expect(screen.getByTestId('ruta')).toHaveTextContent('/registro')
    expect(crear()).toBeEnabled()
  })
})
