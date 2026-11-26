import { vi, type Mock } from 'vitest'
import type * as Servicio from '../services/artcrate.service'

// Réplica de la capa HTTP para las pruebas de pantallas: cada método de la API es un vi.fn().
// Una llamada que la prueba no configuró falla con un mensaje claro, así nunca se sale a la red sin querer.
type Apis = Pick<typeof Servicio, 'catalogoApi' | 'inventarioApi' | 'usuariosApi' | 'carritoApi' | 'pedidosApi' | 'pagosApi'>
type Falsa<T> = { [K in keyof T]: T[K] extends (...args: infer A) => infer R ? Mock<(...args: A) => R> : T[K] }
type ApisFalsas = { [K in keyof Apis]: Falsa<Apis[K]> }

const NOMBRES = ['catalogoApi', 'inventarioApi', 'usuariosApi', 'carritoApi', 'pedidosApi', 'pagosApi'] as const

function falsear(nombre: string, real: object) {
  return Object.fromEntries(
    Object.keys(real).map((metodo) => [
      metodo,
      vi.fn(() => Promise.reject(new Error(`${nombre}.${metodo} no está configurada en esta prueba`))),
    ]),
  )
}

export const api = {} as ApisFalsas

// Se usa en vi.mock: conserva los formateadores reales (precioCLP, urlImagen...) y reemplaza solo las APIs
export function conApiFalsa(original: typeof Servicio) {
  for (const nombre of NOMBRES) Object.assign(api, { [nombre]: falsear(nombre, original[nombre]) })
  return { ...original, ...api }
}

// Deja todas las llamadas como "no configuradas"; se invoca en el beforeEach de cada archivo
export function reiniciarApi() {
  for (const nombre of NOMBRES) for (const fn of Object.values(api[nombre])) (fn as Mock).mockReset()
}
