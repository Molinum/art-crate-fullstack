// Validaciones del formulario de pago (simulado). Solo se comprueba el formato: no se contacta a ningún banco.

// Algoritmo de Luhn: detecta números de tarjeta mal escritos
export function luhnValido(numero: string) {
  if (!/^\d+$/.test(numero)) return false
  let suma = 0
  for (let i = 0; i < numero.length; i++) {
    let d = Number(numero[numero.length - 1 - i])
    if (i % 2 === 1) {
      d *= 2
      if (d > 9) d -= 9
    }
    suma += d
  }
  return suma % 10 === 0
}

// "MM/AA": mes entre 01 y 12 y que la tarjeta no esté vencida (vale hasta el último día del mes indicado)
export function vencimientoValido(texto: string, hoy = new Date()) {
  const m = /^(\d{2})\/(\d{2})$/.exec(texto)
  if (!m) return false
  const mes = Number(m[1])
  const anio = 2000 + Number(m[2])
  if (mes < 1 || mes > 12) return false
  return anio > hoy.getFullYear() || (anio === hoy.getFullYear() && mes >= hoy.getMonth() + 1)
}

// Mientras se escribe: "4242424242424242" -> "4242 4242 4242 4242" (máximo 16 dígitos)
export const formatearNumero = (v: string) => v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ')

// "1230" -> "12/30"
export function formatearVencimiento(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 4)
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d
}
