import { Link, useParams } from 'react-router-dom'
import { Cargando, ErrorApi } from '../components/Estado'
import { useSesion } from '../context/SesionContext'
import { useApi } from '../hooks'
import { fechaHora, pagosApi, pedidosApi, precioCLP } from '../services/artcrate.service'

const METODO = { TARJETA: 'Tarjeta', TRANSFERENCIA: 'Transferencia' }

// Comprobante imprimible de un pedido pagado
export function Comprobante() {
  const { id } = useParams()
  const { usuario } = useSesion()
  const pedido = useApi(() => pedidosApi.obtener(Number(id)), [id])
  const pagos = useApi(() => pagosApi.delPedido(Number(id)), [id])

  if (!usuario) return <div className="container py-5"><p><Link to="/login">Ingresa</Link> para ver el comprobante.</p></div>
  if ((pedido.cargando || pagos.cargando) && !pedido.datos) return <Cargando />
  const error = pedido.error ?? pagos.error
  if (error || !pedido.datos) return <div className="container py-5"><ErrorApi mensaje={error ?? 'No encontramos el pedido'} /></div>

  const p = pedido.datos
  const pago = pagos.datos?.find((x) => x.estado === 'APROBADO')
  if (!pago) {
    return (
      <div className="container py-5">
        <div className="alert alert-secondary">Este pedido aún no tiene un pago aprobado, por eso no hay comprobante.</div>
        <Link to={`/pedidos/${p.id}`}>Volver al pedido</Link>
      </div>
    )
  }

  return (
    <div className="container py-5" style={{ maxWidth: 720 }}>
      <div className="d-flex justify-content-between align-items-center mb-3 no-imprimir">
        <Link to={`/pedidos/${p.id}`}>← Volver al pedido</Link>
        <button className="btn btn-outline-secondary" onClick={() => window.print()}>Imprimir o guardar PDF</button>
      </div>

      <div className="card formulario-card"><div className="card-body p-4">
        <div className="d-flex justify-content-between align-items-start mb-4">
          <div>
            <h1 className="h3 mb-1">Comprobante de pago</h1>
            <p className="text-secondary mb-0">ArtCrate · Pedido #{p.id}</p>
          </div>
          <span className="badge text-bg-success">Pago aprobado</span>
        </div>

        <dl className="row small">
          <dt className="col-sm-4">Cliente</dt><dd className="col-sm-8">{usuario.id === p.usuarioId ? `${usuario.nombre} ${usuario.apellido}` : `Usuario ${p.usuarioId}`}</dd>
          <dt className="col-sm-4">Fecha del pago</dt><dd className="col-sm-8">{fechaHora(pago.fecha)}</dd>
          <dt className="col-sm-4">Método</dt><dd className="col-sm-8">{METODO[pago.metodo]}{pago.ultimosDigitos && ` (•••• ${pago.ultimosDigitos})`}</dd>
          <dt className="col-sm-4">N° de transacción</dt><dd className="col-sm-8 text-break">{pago.codigoTransaccion}</dd>
          <dt className="col-sm-4">Despacho</dt><dd className="col-sm-8">{p.direccionDespacho}, {p.comuna}, {p.region}</dd>
        </dl>

        <table className="table table-sm align-middle">
          <thead><tr><th>Producto</th><th className="text-end">Cant.</th><th className="text-end">Subtotal</th></tr></thead>
          <tbody>
            {p.items.map((i) => <tr key={i.productoId}><td>{i.nombre}</td><td className="text-end">{i.cantidad}</td><td className="text-end">{precioCLP(i.subtotal)}</td></tr>)}
          </tbody>
          <tfoot><tr><th colSpan={2}>Total pagado</th><th className="text-end">{precioCLP(pago.monto)}</th></tr></tfoot>
        </table>
        <p className="small text-secondary mb-0">Documento generado por una simulación de pago: no tiene validez tributaria.</p>
      </div></div>
    </div>
  )
}
