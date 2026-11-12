import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Cargando, ErrorApi } from '../components/Estado'
import { useSesion } from '../context/SesionContext'
import { useApi } from '../hooks'
import { pagosApi, pedidosApi, precioCLP } from '../services/artcrate.service'

export function Pedidos() {
  const { usuario } = useSesion()
  const [version, setVersion] = useState(0)
  const [errorPago, setErrorPago] = useState<string | null>(null)
  const { datos: pedidos, cargando, error } = useApi(
    () => (usuario ? pedidosApi.deUsuario(usuario.id) : Promise.resolve([])),
    [usuario?.id, version],
  )

  if (!usuario) {
    return <div className="container py-5"><p><Link to="/login">Ingresa</Link> para ver tus pedidos.</p></div>
  }

  async function pagar(pedidoId: number) {
    setErrorPago(null)
    try {
      await pagosApi.pagar(pedidoId, 'TARJETA')
      setVersion((v) => v + 1)
    } catch (e) {
      setErrorPago((e as Error).message)
    }
  }

  return (
    <div className="container py-5">
      <h1 className="mb-4">Mis pedidos</h1>
      {cargando && <Cargando />}
      {error && <ErrorApi mensaje={error} />}
      {errorPago && <ErrorApi mensaje={errorPago} />}
      {pedidos?.length === 0 && <p>Aún no tienes pedidos.</p>}
      {pedidos?.map((p) => (
        <article className="card formulario-card mb-3" key={p.id}>
          <div className="card-body">
            <div className="d-flex justify-content-between flex-wrap gap-2">
              <h2 className="h5 mb-0">Pedido #{p.id}</h2>
              <span className="badge text-bg-secondary">{p.estado.replace('_', ' ')}</span>
            </div>
            <p className="small text-muted">{new Date(p.fecha).toLocaleString('es-CL')} · {p.direccionDespacho}, {p.comuna}</p>
            <ul className="mb-2">
              {p.items.map((i) => <li key={i.productoId}>{i.cantidad} × {i.nombre} — {precioCLP(i.subtotal)}</li>)}
            </ul>
            <p className="precio mb-2">Total: {precioCLP(p.total)}</p>
            {p.estado === 'PENDIENTE_PAGO' && (
              <button className="btn btn-primary btn-sm" onClick={() => pagar(p.id)}>Pagar con tarjeta (simulado)</button>
            )}
          </div>
        </article>
      ))}
    </div>
  )
}
