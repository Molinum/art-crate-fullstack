import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Contacto } from './Contacto'

function montar() {
  render(<Contacto />)
  return userEvent.setup()
}
const enviar = () => screen.getByRole('button', { name: 'Enviar mensaje' })

async function llenarValido(u: ReturnType<typeof montar>) {
  await u.type(screen.getByLabelText('Nombre'), 'Camila Rojas')
  await u.type(screen.getByLabelText('Correo electrónico'), 'camila@artcrate.cl')
  await u.selectOptions(screen.getByLabelText('Asunto'), 'pedido')
  await u.type(screen.getByLabelText('Mensaje'), 'Quisiera saber cuándo llega mi pedido.')
}

describe('Formulario de contacto', () => {
  it('vacío muestra los 4 errores y no confirma el envío', async () => {
    const u = montar()
    await u.click(enviar())

    expect(screen.getByText('El nombre debe tener al menos 3 caracteres')).toBeInTheDocument()
    expect(screen.getByText(/formato válido/)).toBeInTheDocument()
    expect(screen.getAllByText('Selecciona un asunto').length).toBeGreaterThan(1) // la opción vacía + el error
    expect(screen.getByText('El mensaje debe tener entre 10 y 500 caracteres')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('un mensaje de menos de 10 caracteres (o solo espacios) no sirve', async () => {
    const u = montar()
    await llenarValido(u)
    await u.clear(screen.getByLabelText('Mensaje'))
    await u.type(screen.getByLabelText('Mensaje'), '   hola    ')
    await u.click(enviar())

    expect(screen.getByText('El mensaje debe tener entre 10 y 500 caracteres')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('un mensaje de más de 500 caracteres no se envía y el contador lo muestra', async () => {
    const u = montar()
    await llenarValido(u)
    await u.clear(screen.getByLabelText('Mensaje'))
    await u.click(screen.getByLabelText('Mensaje'))
    await u.paste('x'.repeat(501))

    expect(screen.getByText('501 / 500 caracteres')).toBeInTheDocument()
    await u.click(enviar())
    expect(screen.getByText('El mensaje debe tener entre 10 y 500 caracteres')).toBeInTheDocument()
  })

  it('el contador sigue lo que se escribe', async () => {
    const u = montar()
    expect(screen.getByText('0 / 500 caracteres')).toBeInTheDocument()
    await u.type(screen.getByLabelText('Mensaje'), 'hola')
    expect(screen.getByText('4 / 500 caracteres')).toBeInTheDocument()
  })

  it('con datos válidos confirma el envío y deja el formulario limpio', async () => {
    const u = montar()
    await llenarValido(u)
    await u.click(enviar())

    expect(screen.getByRole('status')).toHaveTextContent('Recibimos tu mensaje')
    expect(screen.getByLabelText('Nombre')).toHaveValue('')
    expect(screen.getByLabelText('Mensaje')).toHaveValue('')
    expect(screen.getByLabelText('Asunto')).toHaveValue('')
  })
})
