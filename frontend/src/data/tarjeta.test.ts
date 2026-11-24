import { describe, expect, it } from 'vitest'
import { formatearNumero, formatearVencimiento, luhnValido, vencimientoValido } from './tarjeta'

describe('luhnValido', () => {
  it.each(['4242424242424242', '4000000000000002', '4000000000009995', '5555555555554444'])('acepta %s', (n) => {
    expect(luhnValido(n)).toBe(true)
  })

  it.each(['4242424242424241', '1234567812345678', '0000000000000001'])('rechaza %s', (n) => {
    expect(luhnValido(n)).toBe(false)
  })

  it('rechaza texto que no son solo dígitos', () => {
    expect(luhnValido('4242 4242 4242 4242')).toBe(false)
    expect(luhnValido('abcd')).toBe(false)
    expect(luhnValido('')).toBe(false)
  })
})

describe('vencimientoValido', () => {
  const hoy = new Date(2026, 10, 24) // 24 de noviembre de 2026

  it('acepta una fecha futura', () => {
    expect(vencimientoValido('12/30', hoy)).toBe(true)
    expect(vencimientoValido('01/27', hoy)).toBe(true)
  })

  it('acepta el mes actual (vale hasta fin de mes)', () => {
    expect(vencimientoValido('11/26', hoy)).toBe(true)
  })

  it('rechaza el mes anterior y años pasados', () => {
    expect(vencimientoValido('10/26', hoy)).toBe(false)
    expect(vencimientoValido('12/25', hoy)).toBe(false)
    expect(vencimientoValido('01/20', hoy)).toBe(false)
  })

  it('rechaza meses fuera de 01-12 y formatos incorrectos', () => {
    expect(vencimientoValido('00/30', hoy)).toBe(false)
    expect(vencimientoValido('13/30', hoy)).toBe(false)
    expect(vencimientoValido('1/30', hoy)).toBe(false)
    expect(vencimientoValido('12-30', hoy)).toBe(false)
    expect(vencimientoValido('', hoy)).toBe(false)
  })
})

describe('formato mientras se escribe', () => {
  it('agrupa el número de a 4 dígitos y corta en 16', () => {
    expect(formatearNumero('4242424242424242')).toBe('4242 4242 4242 4242')
    expect(formatearNumero('42424')).toBe('4242 4')
    expect(formatearNumero('4242 4242 4242 4242 9999')).toBe('4242 4242 4242 4242')
  })

  it('ignora lo que no sea un dígito', () => {
    expect(formatearNumero('42a4-2')).toBe('4242')
  })

  it('pone la barra del vencimiento', () => {
    expect(formatearVencimiento('1')).toBe('1')
    expect(formatearVencimiento('123')).toBe('12/3')
    expect(formatearVencimiento('1230')).toBe('12/30')
    expect(formatearVencimiento('123099')).toBe('12/30')
  })
})
