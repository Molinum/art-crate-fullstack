import { ETIQUETA_ESTADO, FLUJO } from '../data/negocio'
import { fechaHora, precioCLP } from '../services/artcrate.service'
import type { Pago, Pedido, Usuario } from '../types'
import { InsigniaEstado } from './InsigniaEstado'

interface Props {
  pedido: Pedido
  pago?: Pago | null
  cliente?: Usuario | null // solo lo recibe la vista de administración
}

const METODO: Record<string, string> = { TARJETA: 'Tarjeta', TRANSFERENCIA: 'Transferencia' }

// Detalle completo de un pedido: seguimiento, productos, despacho, pago y (para el admin) cliente
export function DetallePedido({ pedido, pago, cliente }: Props) {
  const indice = FLUJO.indexOf(pedido.estado) // -1 si está cancelado
  const unidades = pedido.items.reduce((total, i) => total + i.cantidad, 0)

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <h1 className="mb-0">Pedido #{pedido.id}</h1>
        <InsigniaEstado estado={pedido.estado} />
      </div>
      <p className="text-secondary">Realizado el {fechaHora(pedido.fecha)}</p>

      {pedido.estado === 'CANCELADO' ? (
        <div className="alert alert-secondary">Este pedido fue cancelado. El stock de sus productos volvió al inventario.</div>
      ) : (
        <ol className="seguimiento" aria-label="Seguimiento del pedido">
          {FLUJO.map((e, i) => (
            <li key={e} className={i < indice ? 'hecho' : i === indice ? 'actual' : ''}>
              {i < indice ? '✓ ' : ''}{ETIQUETA_ESTADO[e]}
            </li>
          ))}
        </ol>
      )}

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead><tr><th>Producto</th><th className="text-end">Precio</th><th className="text-end">Cantidad</th><th className="text-end">Subtotal</th></tr></thead>
              <tbody>
                {pedido.items.map((i) => (
                  <tr key={i.productoId}>
                    <td>{i.nombre}</td>
                    <td className="text-end">{precioCLP(i.precioUnitario)}</td>
                    <td className="text-end">{i.cantidad}</td>
                    <td className="text-end">{precioCLP(i.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><th colSpan={2}>Total ({unidades} {unidades === 1 ? 'unidad' : 'unidades'})</th><th></th><th className="text-end precio">{precioCLP(pedido.total)}</th></tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="col-lg-4 d-flex flex-column gap-3">
          {cliente && (
            <section className="card formulario-card"><div className="card-body">
              <h2 className="h6 text-uppercase text-secondary">Cliente</h2>
              <p className="mb-0 fw-semibold">{cliente.nombre} {cliente.apellido}</p>
              <p className="mb-0 small">{cliente.correo}</p>
              {cliente.telefono && <p className="mb-0 small">{cliente.telefono}</p>}
            </div></section>
          )}
          <section className="card formulario-card"><div className="card-body">
            <h2 className="h6 text-uppercase text-secondary">Despacho</h2>
            <p className="mb-0">{pedido.direccionDespacho}</p>
            <p className="mb-0 small">{pedido.comuna}, {pedido.region}</p>
          </div></section>
          <section className="card formulario-card"><div className="card-body">
            <h2 className="h6 text-uppercase text-secondary">Pago</h2>
            {pago ? (
              <dl className="mb-0 small">
                <dt>Método</dt><dd>{METODO[pago.metodo] ?? pago.metodo}</dd>
                <dt>Estado</dt><dd>{pago.estado === 'APROBADO' ? 'Aprobado' : pago.estado}</dd>
                <dt>Monto</dt><dd>{precioCLP(pago.monto)}</dd>
                <dt>Fecha</dt><dd>{fechaHora(pago.fecha)}</dd>
                <dt>Código de transacción</dt><dd className="mb-0 text-break">{pago.codigoTransaccion}</dd>
              </dl>
            ) : (
              <p className="mb-0 small">{pedido.estado === 'CANCELADO' ? 'El pedido se canceló sin registrar un pago.' : 'Aún no hay un pago registrado.'}</p>
            )}
          </div></section>
        </div>
      </div>
    </>
  )
}
