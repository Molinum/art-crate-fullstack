import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import type { Usuario } from '../types'
import { SesionProvider, useSesion } from './SesionContext'

const usuario: Usuario = {
  id: 2, nombre: 'Cliente', apellido: 'Prueba', correo: 'cliente@artcrate.cl', telefono: null, region: null, rol: 'CLIENTE', activo: true,
}
const envoltorio = ({ children }: { children: ReactNode }) => <SesionProvider>{children}</SesionProvider>

describe('SesionContext', () => {
  it('empieza sin sesión', () => {
    const { result } = renderHook(() => useSesion(), { wrapper: envoltorio })
    expect(result.current.usuario).toBeNull()
  })

  it('iniciar guarda al usuario y el token', () => {
    const { result } = renderHook(() => useSesion(), { wrapper: envoltorio })
    act(() => result.current.iniciar(usuario, 'token-123'))

    expect(result.current.usuario?.correo).toBe('cliente@artcrate.cl')
    expect(localStorage.getItem('artcrate.token')).toBe('token-123')
    expect(JSON.parse(localStorage.getItem('artcrate.usuario')!).id).toBe(2)
  })

  it('cerrar borra al usuario y el token', () => {
    const { result } = renderHook(() => useSesion(), { wrapper: envoltorio })
    act(() => result.current.iniciar(usuario, 'token-123'))
    act(() => result.current.cerrar())

    expect(result.current.usuario).toBeNull()
    expect(localStorage.getItem('artcrate.token')).toBeNull()
    expect(localStorage.getItem('artcrate.usuario')).toBeNull()
  })

  it('recupera la sesión guardada al recargar la página', () => {
    localStorage.setItem('artcrate.usuario', JSON.stringify(usuario))
    const { result } = renderHook(() => useSesion(), { wrapper: envoltorio })
    expect(result.current.usuario?.nombre).toBe('Cliente')
  })

  it('ignora un valor guardado dañado', () => {
    localStorage.setItem('artcrate.usuario', '{no es json')
    const { result } = renderHook(() => useSesion(), { wrapper: envoltorio })
    expect(result.current.usuario).toBeNull()
  })
})
