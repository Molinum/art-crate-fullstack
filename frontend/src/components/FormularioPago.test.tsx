import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FormularioPago } from './FormularioPago'

function montar(procesando = false) {
  const onPagar = vi.fn()
  render(<FormularioPago pedidoId={12} total={25980} procesando={procesando} onPagar={onPagar} />)
  return { onPagar, usuario: userEvent.setup() }
}

async function llenar(usuario: ReturnType<typeof userEvent.setup>, datos: { numero?: string; nombre?: string; vence?: string; cvv?: string }) {
  if (datos.numero !== undefined) await usuario.type(screen.getByLabelText('Número de tarjeta'), datos.numero)
  if (datos.nombre !== undefined) await usuario.type(screen.getByLabelText('Nombre en la tarjeta'), datos.nombre)
  if (datos.vence !== undefined) await usuario.type(screen.getByLabelText('Vencimiento'), datos.vence)
  if (datos.cvv !== undefined) await usuario.type(screen.getByLabelText('CVV'), datos.cvv)
}

const botonPagar = () => screen.getByRole('button', { name: /^Pagar/ })

describe('FormularioPago con tarjeta', () => {
  it('muestra el total en el título y en el botón', () => {
    montar()
    expect(screen.getByRole('heading', { name: /\$25\.980/ })).toBeInTheDocument()
    expect(botonPagar()).toHaveTextContent('$25.980')
  })

  it('con el formulario vacío muestra los 4 errores y no paga', async () => {
    const { onPagar, usuario } = montar()
    await usuario.click(botonPagar())

    expect(screen.getByText('El número de la tarjeta no es válido')).toBeInTheDocument()
    expect(screen.getByText(/nombre que aparece/i)).toBeInTheDocument()
    expect(screen.getByText(/Fecha inválida o vencida/)).toBeInTheDocument()
    expect(screen.getByText(/CVV tiene 3 dígitos/)).toBeInTheDocument()
    expect(onPagar).not.toHaveBeenCalled()
  })

  it('un número con dígito verificador incorrecto no se acepta', async () => {
    const { onPagar, usuario } = montar()
    await llenar(usuario, { numero: '4242424242424241', nombre: 'Ana Pérez', vence: '1230', cvv: '123' })
    await usuario.click(botonPagar())

    expect(screen.getByText('El número de la tarjeta no es válido')).toBeInTheDocument()
    expect(onPagar).not.toHaveBeenCalled()
  })

  it('una tarjeta vencida no se acepta', async () => {
    const { onPagar, usuario } = montar()
    await llenar(usuario, { numero: '4242424242424242', nombre: 'Ana Pérez', vence: '0120', cvv: '123' })
    await usuario.click(botonPagar())

    expect(screen.getByText(/Fecha inválida o vencida/)).toBeInTheDocument()
    expect(onPagar).not.toHaveBeenCalled()
  })

  it('con datos válidos paga enviando SOLO los últimos 4 dígitos', async () => {
    const { onPagar, usuario } = montar()
    await llenar(usuario, { numero: '4242424242424242', nombre: 'Ana Pérez', vence: '1230', cvv: '123' })
    await usuario.click(botonPagar())

    expect(onPagar).toHaveBeenCalledTimes(1)
    expect(onPagar).toHaveBeenCalledWith('TARJETA', '4242')
    expect(JSON.stringify(onPagar.mock.calls)).not.toContain('4242 4242')
  })

  it('formatea el número y el vencimiento mientras se escribe', async () => {
    const { usuario } = montar()
    await llenar(usuario, { numero: '4000000000000002', vence: '1230' })

    expect(screen.getByLabelText('Número de tarjeta')).toHaveValue('4000 0000 0000 0002')
    expect(screen.getByLabelText('Vencimiento')).toHaveValue('12/30')
  })

  it('el CVV acepta como máximo 3 dígitos y solo números', async () => {
    const { usuario } = montar()
    await llenar(usuario, { cvv: '12ab345' })
    expect(screen.getByLabelText('CVV')).toHaveValue('123')
  })

  it('mientras procesa, el botón está deshabilitado', () => {
    montar(true)
    expect(screen.getByRole('button', { name: /Procesando pago/ })).toBeDisabled()
  })

  it('lista las tarjetas de prueba', () => {
    montar()
    expect(screen.getByText('4242 4242 4242 4242')).toBeInTheDocument()
    expect(screen.getByText('4000 0000 0000 0002')).toBeInTheDocument()
  })
})

describe('FormularioPago con transferencia', () => {
  it('muestra los datos bancarios y la glosa con el número del pedido', async () => {
    const { usuario } = montar()
    await usuario.click(screen.getByRole('button', { name: 'Transferencia' }))

    expect(screen.getByText('ARTCRATE-12')).toBeInTheDocument()
    expect(screen.getByText('000-12345-67')).toBeInTheDocument()
    expect(screen.queryByLabelText('Número de tarjeta')).not.toBeInTheDocument()
  })

  it('"Ya realicé la transferencia" paga sin dígitos de tarjeta', async () => {
    const { onPagar, usuario } = montar()
    await usuario.click(screen.getByRole('button', { name: 'Transferencia' }))
    await usuario.click(screen.getByRole('button', { name: 'Ya realicé la transferencia' }))

    expect(onPagar).toHaveBeenCalledWith('TRANSFERENCIA')
  })
})
