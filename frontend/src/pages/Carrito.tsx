import { useState } from 'react'
import type { Carrito as CarritoDatos } from '../types'
import { Link, useNavigate } from 'react-router-dom'
import { Cargando, ErrorApi } from '../components/Estado'
import { useSesion } from '../context/SesionContext'
import { useApi } from '../hooks'
import { carritoApi, pedidosApi, precioCLP, urlImagen } from '../services/artcrate.service'

export function Carrito() {
  const { usuario } = useSesion()
  const navegar = useNavigate()
  const { datos: inicial, cargando, error } = useApi(
    () => (usuario ? carritoApi.ver(usuario.id) : Promise.resolve(null)),
    [usuario?.id],
  )
  // después de cada acción el carrito se actualiza con la respuesta del servidor, sin volver a pedirlo
  const [actualizado, setActualizado] = useState<CarritoDatos | null>(null)
  const carrito = actualizado ?? inicial
  const [pendiente, setPendiente] = useState<number | null>(null) // producto en proceso de cambio
  const [errorAccion, setErrorAccion] = useState<string | null>(null)
  const [dir, setDir] = useState({ direccionDespacho: '', comuna: '', region: '' })

  if (!usuario) {
    return <div className="container py-5"><p>Para ver tu carrito, <Link to="/login">ingresa a tu cuenta</Link>.</p></div>
  }

  async function cambiarCantidad(productoId: number, cantidad: number) {
    if (cantidad < 1 || pendiente !== null) return
    setErrorAccion(null)
    setPendiente(productoId)
    try {
      setActualizado(await carritoApi.cambiarCantidad(usuario!.id, productoId, cantidad))
    } catch (e) {
      setErrorAccion((e as Error).message)
    } finally {
      setPendiente(null)
    }
  }

  async function quitar(productoId: number) {
    setErrorAccion(null)
    try {
      await carritoApi.quitar(usuario!.id, productoId)
      const items = carrito!.items.filter((i) => i.productoId !== productoId)
      setActualizado({ ...carrito!, items, total: items.reduce((t, i) => t + i.subtotal, 0) })
    } catch (e) {
      setErrorAccion((e as Error).message)
    }
  }

  async function vaciar() {
    setErrorAccion(null)
    try {
      await carritoApi.vaciar(usuario!.id)
      setActualizado({ ...carrito!, items: [], total: 0 })
    } catch (e) {
      setErrorAccion((e as Error).message)
    }
  }

  async function comprar(e: React.FormEvent) {
    e.preventDefault()
    setErrorAccion(null)
    try {
      await pedidosApi.crear({ usuarioId: usuario!.id, ...dir })
      navegar('/pedidos')
    } catch (err) {
      setErrorAccion((err as Error).message)
    }
  }

  return (
    <div className="container py-5">
      <h1 className="mb-4">Tu carrito</h1>
      {cargando && !carrito && <Cargando />}
      {error && <ErrorApi mensaje={error} />}
      {errorAccion && <ErrorApi mensaje={errorAccion} />}

      {carrito && carrito.items.length === 0 && (
        <p>Tu carrito está vacío. <Link to="/catalogo">Ir al catálogo</Link></p>
      )}

      {carrito && carrito.items.length > 0 && (
        <>
          <div className="table-responsive">
            <table className="table align-middle tabla-carrito">
              <colgroup>
                <col style={{ width: 88 }} />
                <col />
                <col style={{ width: 120 }} />
                <col style={{ width: 150 }} />
                <col style={{ width: 130 }} />
                <col style={{ width: 120 }} />
              </colgroup>
              <thead>
                <tr><th></th><th>Producto</th><th>Precio</th><th>Cantidad</th><th>Subtotal</th><th></th></tr>
              </thead>
              <tbody>
                {carrito.items.map((i) => (
                  <tr key={i.productoId}>
                    <td><img className="imagen-carrito" src={urlImagen(i.imagenUrl)} alt="" /></td>
                    <td className="carrito-nombre">{i.nombre}</td>
                    <td data-label="Precio">{precioCLP(i.precioUnitario)}</td>
                    <td data-label="Cantidad">
                      <div className="d-inline-flex align-items-center gap-2">
                        <button
                          className="btn btn-sm btn-outline-secondary px-2 py-0"
                          aria-label={`Disminuir cantidad de ${i.nombre}`}
                          disabled={i.cantidad <= 1 || pendiente !== null}
                          onClick={() => cambiarCantidad(i.productoId, i.cantidad - 1)}
                        >−</button>
                        <span className="text-center" style={{ minWidth: 24 }} aria-live="polite">{i.cantidad}</span>
                        <button
                          className="btn btn-sm btn-outline-secondary px-2 py-0"
                          aria-label={`Aumentar cantidad de ${i.nombre}`}
                          disabled={pendiente !== null}
                          onClick={() => cambiarCantidad(i.productoId, i.cantidad + 1)}
                        >+</button>
                      </div>
                    </td>
                    <td data-label="Subtotal">{precioCLP(i.subtotal)}</td>
                    <td>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => quitar(i.productoId)}>
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><th colSpan={4} className="text-end">Total</th><th className="precio">{precioCLP(carrito.total)}</th><th className="carrito-vacio"></th></tr>
              </tfoot>
            </table>
          </div>
          <button className="btn btn-outline-secondary mb-4" onClick={() => vaciar()}>
            Vaciar carrito
          </button>

          <form className="card formulario-card p-4" onSubmit={comprar}>
            <h2 className="h4">Datos de despacho</h2>
            <div className="row g-3">
              <div className="col-12">
                <input className="form-control" placeholder="Dirección" required value={dir.direccionDespacho}
                  onChange={(e) => setDir({ ...dir, direccionDespacho: e.target.value })} />
              </div>
              <div className="col-md-6">
                <input className="form-control" placeholder="Comuna" required value={dir.comuna}
                  onChange={(e) => setDir({ ...dir, comuna: e.target.value })} />
              </div>
              <div className="col-md-6">
                <input className="form-control" placeholder="Región" required value={dir.region}
                  onChange={(e) => setDir({ ...dir, region: e.target.value })} />
              </div>
            </div>
            <button className="btn btn-primary mt-3 align-self-start" type="submit">Crear pedido</button>
          </form>
        </>
      )}
    </div>
  )
}
