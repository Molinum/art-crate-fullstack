import { createContext, useContext, useState, type ReactNode } from 'react'
import { CLAVE_TOKEN } from '../services/artcrate.service'
import type { Usuario } from '../types'

interface SesionValor {
  usuario: Usuario | null
  iniciar: (u: Usuario, token: string) => void
  cerrar: () => void
}

const CLAVE = 'artcrate.usuario'
const SesionContext = createContext<SesionValor | null>(null)

function leerGuardado(): Usuario | null {
  try {
    const t = localStorage.getItem(CLAVE)
    return t ? (JSON.parse(t) as Usuario) : null
  } catch {
    return null
  }
}

// El login entrega un JWT: se guarda junto al usuario y artcrate.service lo envía en cada llamada
export function SesionProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(leerGuardado)

  function iniciar(u: Usuario, token: string) {
    setUsuario(u)
    localStorage.setItem(CLAVE, JSON.stringify(u))
    localStorage.setItem(CLAVE_TOKEN, token)
  }

  function cerrar() {
    setUsuario(null)
    localStorage.removeItem(CLAVE)
    localStorage.removeItem(CLAVE_TOKEN)
  }

  return <SesionContext.Provider value={{ usuario, iniciar, cerrar }}>{children}</SesionContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSesion() {
  const ctx = useContext(SesionContext)
  if (!ctx) throw new Error('useSesion debe usarse dentro de SesionProvider')
  return ctx
}
