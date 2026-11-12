import { useEffect, useState } from 'react'

// Ejecuta una llamada a la API y entrega { datos, cargando, error }
export function useApi<T>(llamada: () => Promise<T>, deps: unknown[]) {
  const [datos, setDatos] = useState<T | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let activo = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCargando(true)
    setError(null)
    llamada()
      .then((d) => activo && setDatos(d))
      .catch((e: Error) => activo && setError(e.message))
      .finally(() => activo && setCargando(false))
    return () => { activo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { datos, cargando, error }
}
