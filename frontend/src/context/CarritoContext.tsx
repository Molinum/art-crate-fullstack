import { createContext, useContext, useState, type ReactNode } from 'react'
import { useApi } from '../hooks'
import { carritoApi } from '../services/artcrate.service'
import { useSesion } from './SesionContext'

interface CarritoValor {
  cantidad: number // unidades totales en el carrito (para el contador del navbar)
  fijarCantidad: (n: number) => void
}

const CarritoContext = createContext<CarritoValor | null>(null)

// Se carga una vez al iniciar sesión; después cada acción del carrito actualiza el número con la respuesta del servidor
export function CarritoProvider({ children }: { children: ReactNode }) {
  const { usuario } = useSesion()
  const { datos } = useApi(
    () => (usuario ? carritoApi.ver(usuario.id) : Promise.resolve(null)),
    [usuario?.id],
  )
  const [fijada, setFijada] = useState<{ usuarioId: number; n: number } | null>(null)

  const inicial = datos?.items.reduce((total, i) => total + i.cantidad, 0) ?? 0
  const cantidad = !usuario ? 0 : fijada?.usuarioId === usuario.id ? fijada.n : inicial
  const fijarCantidad = (n: number) => {
    if (usuario) setFijada({ usuarioId: usuario.id, n })
  }

  return <CarritoContext.Provider value={{ cantidad, fijarCantidad }}>{children}</CarritoContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCarrito() {
  const ctx = useContext(CarritoContext)
  if (!ctx) throw new Error('useCarrito debe usarse dentro de CarritoProvider')
  return ctx
}
