import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCarrito } from '../context/CarritoContext'
import { useSesion } from '../context/SesionContext'
import { carritoApi, precioCLP, unidadesCarrito, urlImagen } from '../services/artcrate.service'
import type { Producto } from '../types'

interface Props {
  producto: Producto
  agregable?: boolean // muestra el botón "Agregar al carrito" (el catálogo lo activa)
  stock?: number // si se conoce y es 0, el botón queda desactivado
}

export function TarjetaProducto({ producto, agregable = false, stock }: Props) {
  const navegar = useNavigate()
  const { usuario } = useSesion()
  const { fijarCantidad } = useCarrito()
  const [estado, setEstado] = useState<'libre' | 'agregando' | 'agregado'>('libre')
  const [error, setError] = useState<string | null>(null)

  // "✓ Agregado" se muestra un momento y el botón vuelve a quedar listo para agregar otra unidad
  useEffect(() => {
    if (estado !== 'agregado') return
    const espera = setTimeout(() => setEstado('libre'), 2000)
    return () => clearTimeout(espera)
  }, [estado])

  async function agregar() {
    if (!usuario) return navegar('/login')
    setError(null)
    setEstado('agregando')
    try {
      fijarCantidad(unidadesCarrito(await carritoApi.agregar(usuario.id, producto.id, 1)))
      setEstado('agregado')
    } catch (e) {
      setError((e as Error).message)
      setEstado('libre')
    }
  }

  const sinStock = stock === 0

  return (
    <div className="col">
      <article className="card h-100 tarjeta-producto">
        <img src={urlImagen(producto.imagenUrl)} className="card-img-top" alt={producto.nombre} width="300" height="300" />
        <div className="card-body">
          <span className="categoria">{producto.categoriaNombre}</span>
          <h3 className="card-title">
            <Link className="stretched-link" to={`/producto/${producto.id}`}>{producto.nombre}</Link>
          </h3>
          <p className="card-text precio">{precioCLP(producto.precio)}</p>
          {agregable && (
            // position-relative + z-index: el botón queda por encima del enlace que cubre toda la tarjeta
            <div className="mt-auto position-relative" style={{ zIndex: 2 }}>
              <button
                type="button"
                className={`btn btn-sm w-100 ${estado === 'agregado' ? 'btn-success' : 'btn-primary'}`}
                disabled={sinStock || estado === 'agregando'}
                aria-label={`Agregar ${producto.nombre} al carrito`}
                onClick={agregar}
              >
                {sinStock ? 'Sin stock' : estado === 'agregando' ? 'Agregando...' : estado === 'agregado' ? '✓ Agregado' : 'Agregar al carrito'}
              </button>
              <div aria-live="polite" role="status">
                {error && <p className="small text-danger mt-2 mb-0" role="alert">{error}</p>}
              </div>
            </div>
          )}
        </div>
      </article>
    </div>
  )
}
