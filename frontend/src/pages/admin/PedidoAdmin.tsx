import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { DetallePedido } from '../../components/DetallePedido'
import { Cargando, ErrorApi } from '../../components/Estado'
import { ETIQUETA_ESTADO } from '../../data/negocio'
import { useApi } from '../../hooks'
import { pagosApi, pedidosApi, usuariosApi } from '../../services/artcrate.service'
import type { EstadoPedido } from '../../types'

// Siguiente paso del pedido que puede dar el administrador
const SIGUIENTE: Partial<Record<EstadoPedido, EstadoPedido>> = { PAGADO: 'ENVIADO', ENVIADO: 'ENTREGADO' }
const TEXTO_BOTON: Partial<Record<EstadoPedido, string>> = { ENVIADO: 'Marcar como enviado', ENTREGADO: 'Marcar como entregado' }

export function PedidoAdmin() {
  const { id } = useParams()
  const [version, setVersion] = useState(0)
  const pedido = useApi(() => pedidosApi.obtener(Number(id)), [id, version])
  const pagos = useApi(() => pagosApi.delPedido(Number(id)), [id, version])
  const usuarioId = pedido.datos?.usuarioId
  const cliente = useApi(() => (usuarioId ? usuariosApi.obtener(usuarioId) : Promise.resolve(null)), [usuarioId])
  const [procesando, setProcesando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [errorAccion, setErrorAccion] = useState<string | null>(null)

  if (pedido.cargando && !pedido.datos) return <Cargando />
  if (pedido.error || !pedido.datos) return <ErrorApi mensaje={pedido.error ?? 'No encontramos el pedido'} />

  const p = pedido.datos
  const siguiente = SIGUIENTE[p.estado]

  async function cambiar(nuevo: EstadoPedido) {
    setProcesando(true)
    setAviso(null)
    setErrorAccion(null)
    try {
      await pedidosApi.cambiarEstado(p.id, nuevo)
      setAviso(`El pedido pasó a "${ETIQUETA_ESTADO[nuevo]}".`)
      setVersion((v) => v + 1)
    } catch (e) {
      setErrorAccion((e as Error).message)
    } finally {
      setProcesando(false)
    }
  }

  return (
    <>
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><Link to="/admin/pedidos">Pedidos</Link></li>
          <li className="breadcrumb-item active">Pedido #{p.id}</li>
        </ol>
      </nav>

      {aviso && <div className="alert alert-success" role="status">{aviso}</div>}
      {errorAccion && <ErrorApi mensaje={errorAccion} />}

      <DetallePedido pedido={p} pago={pagos.datos?.find((x) => x.estado === 'APROBADO') ?? null} cliente={cliente.datos} />

      <section className="card formulario-card mt-4"><div className="card-body">
        <h2 className="h5">Gestionar pedido</h2>
        {siguiente || p.estado === 'PENDIENTE_PAGO' ? (
          <div className="d-flex flex-wrap gap-2">
            {siguiente && (
              <button className="btn btn-primary" disabled={procesando} onClick={() => cambiar(siguiente)}>{TEXTO_BOTON[siguiente]}</button>
            )}
            {p.estado === 'PENDIENTE_PAGO' && (
              <button
                className="btn btn-outline-danger"
                disabled={procesando}
                onClick={() => { if (window.confirm('¿Cancelar este pedido? Los productos volverán al inventario.')) cambiar('CANCELADO') }}
              >
                Cancelar pedido
              </button>
            )}
          </div>
        ) : (
          <p className="text-secondary mb-0">
            {p.estado === 'CANCELADO' ? 'Un pedido cancelado no puede cambiar de estado.' : 'Este pedido ya fue entregado, no hay más pasos.'}
          </p>
        )}
        {p.estado === 'PENDIENTE_PAGO' && <p className="small text-secondary mt-2 mb-0">El pedido sigue esperando el pago del cliente; solo se puede cancelar.</p>}
      </div></section>
    </>
  )
}
