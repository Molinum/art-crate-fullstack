import { Link } from 'react-router-dom'
import { Cargando, ErrorApi } from '../components/Estado'
import { InsigniaEstado } from '../components/InsigniaEstado'
import { useSesion } from '../context/SesionContext'
import { useApi } from '../hooks'
import { fechaHora, pedidosApi, precioCLP } from '../services/artcrate.service'

export function Pedidos() {
  const { usuario } = useSesion()
  const { datos, cargando, error } = useApi(
    () => (usuario ? pedidosApi.deUsuario(usuario.id) : Promise.resolve([])),
    [usuario?.id],
  )

  if (!usuario) {
    return <div className="container py-5"><p><Link to="/login">Ingresa</Link> para ver tus pedidos.</p></div>
  }

  // los más recientes primero
  const pedidos = [...(datos ?? [])].sort((a, b) => b.fecha.localeCompare(a.fecha))

  return (
    <div className="container py-5">
      <h1 className="mb-4">Mis pedidos</h1>
      {cargando && <Cargando />}
      {error && <ErrorApi mensaje={error} />}
      {datos?.length === 0 && <p>Aún no tienes pedidos. <Link to="/catalogo">Ir al catálogo</Link></p>}
      {pedidos.map((p) => {
        const unidades = p.items.reduce((total, i) => total + i.cantidad, 0)
        return (
          <article className="card formulario-card mb-3" key={p.id}>
            <div className="card-body">
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                <h2 className="h5 mb-0">Pedido #{p.id}</h2>
                <InsigniaEstado estado={p.estado} />
              </div>
              <p className="small text-secondary mb-2">{fechaHora(p.fecha)}</p>
              <p className="mb-2">
                {p.items.slice(0, 3).map((i) => `${i.cantidad} × ${i.nombre}`).join(', ')}
                {p.items.length > 3 && ` y ${p.items.length - 3} más`}
              </p>
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                <p className="precio mb-0">{precioCLP(p.total)} <span className="small text-secondary fw-normal">· {unidades} {unidades === 1 ? 'unidad' : 'unidades'}</span></p>
                <div className="d-flex gap-2">
                  {p.estado === 'PENDIENTE_PAGO' && <Link className="btn btn-primary btn-sm" to={`/pedidos/${p.id}`}>Pagar</Link>}
                  <Link className="btn btn-outline-secondary btn-sm" to={`/pedidos/${p.id}`}>Ver detalle</Link>
                </div>
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}
