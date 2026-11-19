import { useState } from 'react'
import type { Carrito as CarritoDatos } from '../types'
import { Link, useNavigate } from 'react-router-dom'
import { Campo } from '../components/Campo'
import { Cargando, ErrorApi } from '../components/Estado'
import { SelectorRegionComuna } from '../components/SelectorRegionComuna'
import { useCarrito } from '../context/CarritoContext'
import { useSesion } from '../context/SesionContext'
import { REGIONES, comunasDe } from '../data/chile'
import { useApi } from '../hooks'
import { carritoApi, pedidosApi, precioCLP, unidadesCarrito, urlImagen } from '../services/artcrate.service'

export function Carrito() {
  const { usuario } = useSesion()
  const { fijarCantidad } = useCarrito()
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
  // los datos de despacho se prellenan con la región y comuna del usuario, si coinciden con las listas
  const regionInicial = REGIONES.some((r) => r.nombre === usuario?.region) ? usuario!.region! : ''
  const comunaInicial = comunasDe(regionInicial).includes(usuario?.comuna ?? '') ? usuario!.comuna! : ''
  const [dir, setDir] = useState({ direccionDespacho: '', region: regionInicial, comuna: comunaInicial })
  const [intentado, setIntentado] = useState(false)
  const [creando, setCreando] = useState(false)
  const erroresDir = {
    direccionDespacho: dir.direccionDespacho.trim().length < 5 ? 'Ingresa la dirección de despacho (calle y número)' : undefined,
    region: dir.region ? undefined : 'Selecciona la región',
    comuna: dir.region && !dir.comuna ? 'Selecciona la comuna' : undefined,
  }

  if (!usuario) {
    return <div className="container py-5"><p>Para ver tu carrito, <Link to="/login">ingresa a tu cuenta</Link>.</p></div>
  }

  async function cambiarCantidad(productoId: number, cantidad: number) {
    if (cantidad < 1 || pendiente !== null) return
    setErrorAccion(null)
    setPendiente(productoId)
    try {
      const nuevo = await carritoApi.cambiarCantidad(usuario!.id, productoId, cantidad)
      setActualizado(nuevo)
      fijarCantidad(unidadesCarrito(nuevo))
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
      fijarCantidad(items.reduce((t, i) => t + i.cantidad, 0))
    } catch (e) {
      setErrorAccion((e as Error).message)
    }
  }

  async function vaciar() {
    setErrorAccion(null)
    try {
      await carritoApi.vaciar(usuario!.id)
      setActualizado({ ...carrito!, items: [], total: 0 })
      fijarCantidad(0)
    } catch (e) {
      setErrorAccion((e as Error).message)
    }
  }

  async function comprar(e: React.FormEvent) {
    e.preventDefault()
    setIntentado(true)
    if (erroresDir.direccionDespacho || erroresDir.region || erroresDir.comuna) return
    setErrorAccion(null)
    setCreando(true)
    try {
      const pedido = await pedidosApi.crear({ usuarioId: usuario!.id, ...dir })
      fijarCantidad(0) // el backend vacía el carrito al crear el pedido
      navegar(`/pedidos/${pedido.id}`) // se va al detalle del pedido para poder pagarlo
    } catch (err) {
      setErrorAccion((err as Error).message)
      setCreando(false)
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

          <form className="card formulario-card p-4" onSubmit={comprar} noValidate>
            <h2 className="h4">Datos de despacho</h2>
            <div className="row g-3">
              <Campo id="despacho-direccion" etiqueta="Dirección" error={intentado ? erroresDir.direccionDespacho : undefined} className="col-12">
                <input id="despacho-direccion" className={`form-control ${intentado && erroresDir.direccionDespacho ? 'is-invalid' : ''}`}
                  autoComplete="street-address" placeholder="Calle y número" value={dir.direccionDespacho}
                  onChange={(e) => setDir({ ...dir, direccionDespacho: e.target.value })} />
              </Campo>
              <SelectorRegionComuna
                idBase="despacho"
                region={dir.region}
                comuna={dir.comuna}
                onChange={(region, comuna) => setDir({ ...dir, region, comuna })}
                errorRegion={intentado ? erroresDir.region : undefined}
                errorComuna={intentado ? erroresDir.comuna : undefined}
              />
            </div>
            <button className="btn btn-primary mt-3 align-self-start" type="submit" disabled={creando}>
              {creando ? 'Creando pedido...' : 'Crear pedido'}
            </button>
          </form>
        </>
      )}
    </div>
  )
}
