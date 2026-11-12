import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Usuario } from '../types'

interface SesionValor {
  usuario: Usuario | null
  iniciar: (u: Usuario) => void
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

// El backend no entrega JWT todavía: solo se guarda el usuario devuelto por el login
export function SesionProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(leerGuardado)

  function iniciar(u: Usuario) {
    setUsuario(u)
    localStorage.setItem(CLAVE, JSON.stringify(u))
  }

  function cerrar() {
    setUsuario(null)
    localStorage.removeItem(CLAVE)
  }

  return <SesionContext.Provider value={{ usuario, iniciar, cerrar }}>{children}</SesionContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSesion() {
  const ctx = useContext(SesionContext)
  if (!ctx) throw new Error('useSesion debe usarse dentro de SesionProvider')
  return ctx
}
