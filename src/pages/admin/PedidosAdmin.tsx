import { useState } from 'react'
import { Cargando, ErrorApi } from '../../components/Estado'
import { useApi } from '../../hooks'
import { pedidosApi, precioCLP } from '../../services/artcrate.service'
import type { EstadoPedido } from '../../types'

const ESTADOS: EstadoPedido[] = ['PENDIENTE_PAGO', 'PAGADO', 'ENVIADO', 'ENTREGADO', 'CANCELADO']

export function PedidosAdmin() {
  const [version, setVersion] = useState(0)
  const [errorAccion, setErrorAccion] = useState<string | null>(null)
  const { datos: pedidos, cargando, error } = useApi(pedidosApi.todos, [version])

  async function cambiar(id: number, estado: EstadoPedido) {
    setErrorAccion(null)
    try {
      await pedidosApi.cambiarEstado(id, estado)
    } catch (e) {
      setErrorAccion((e as Error).message)
    }
    setVersion((v) => v + 1)
  }

  return (
    <>
      <h1 className="mb-4">Pedidos</h1>
      {cargando && <Cargando />}
      {(error ?? errorAccion) && <ErrorApi mensaje={(error ?? errorAccion)!} />}
      {pedidos && (
        <div className="table-responsive">
          <table className="table align-middle">
            <thead><tr><th>N°</th><th>Fecha</th><th>Cliente</th><th>Despacho</th><th>Total</th><th>Estado</th></tr></thead>
            <tbody>
              {pedidos.map((p) => (
                <tr key={p.id}>
                  <td>#{p.id}</td>
                  <td>{new Date(p.fecha).toLocaleDateString('es-CL')}</td>
                  <td>Usuario {p.usuarioId}</td>
                  <td>{p.direccionDespacho}, {p.comuna}</td>
                  <td>{precioCLP(p.total)}</td>
                  <td>
                    <select className="form-select form-select-sm" value={p.estado} onChange={(e) => cambiar(p.id, e.target.value as EstadoPedido)}>
                      {ESTADOS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
