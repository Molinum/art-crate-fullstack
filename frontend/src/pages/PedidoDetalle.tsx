import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { DetallePedido } from '../components/DetallePedido'
import { Cargando, ErrorApi } from '../components/Estado'
import { useSesion } from '../context/SesionContext'
import { useApi } from '../hooks'
import { pagosApi, pedidosApi } from '../services/artcrate.service'
import type { MetodoPago } from '../types'

// Detalle de un pedido del cliente. Si está pendiente de pago, desde aquí se paga o se cancela.
export function PedidoDetalle() {
  const { id } = useParams()
  const { usuario } = useSesion()
  const [version, setVersion] = useState(0) // se incrementa para volver a pedir el pedido y su pago
  const pedido = useApi(() => pedidosApi.obtener(Number(id)), [id, version])
  const pagos = useApi(() => pagosApi.delPedido(Number(id)), [id, version])
  const [metodo, setMetodo] = useState<MetodoPago>('TARJETA')
  const [procesando, setProcesando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [errorAccion, setErrorAccion] = useState<string | null>(null)

  if (!usuario) {
    return <div className="container py-5"><p><Link to="/login">Ingresa</Link> para ver tu pedido.</p></div>
  }
  if (pedido.cargando && !pedido.datos) return <Cargando />
  if (pedido.error || !pedido.datos) {
    return <div className="container py-5"><ErrorApi mensaje={pedido.error ?? 'No encontramos el pedido'} /></div>
  }

  const p = pedido.datos
  if (p.usuarioId !== usuario.id && usuario.rol !== 'ADMIN') {
    return <div className="container py-5"><ErrorApi mensaje="No tienes acceso a este pedido." /></div>
  }

  async function ejecutar(accion: () => Promise<unknown>, mensajeOk: string) {
    setProcesando(true)
    setAviso(null)
    setErrorAccion(null)
    try {
      await accion()
      setAviso(mensajeOk)
      setVersion((v) => v + 1)
    } catch (e) {
      setErrorAccion((e as Error).message)
    } finally {
      setProcesando(false)
    }
  }

  const pago = pagos.datos?.[0] ?? null

  return (
    <div className="container py-5">
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><Link to="/pedidos">Mis pedidos</Link></li>
          <li className="breadcrumb-item active">Pedido #{p.id}</li>
        </ol>
      </nav>

      {aviso && <div className="alert alert-success" role="status">{aviso}</div>}
      {errorAccion && <ErrorApi mensaje={errorAccion} />}

      <DetallePedido pedido={p} pago={pago} />

      {p.estado === 'PENDIENTE_PAGO' && (
        <section className="card formulario-card mt-4"><div className="card-body">
          <h2 className="h5">Pagar el pedido</h2>
          <div className="d-flex flex-wrap align-items-center gap-2">
            <label htmlFor="metodo" className="form-label mb-0">Método de pago</label>
            <select id="metodo" className="form-select w-auto" value={metodo} onChange={(e) => setMetodo(e.target.value as MetodoPago)}>
              <option value="TARJETA">Tarjeta</option>
              <option value="TRANSFERENCIA">Transferencia</option>
            </select>
            <button
              className="btn btn-primary"
              disabled={procesando}
              onClick={() => ejecutar(() => pagosApi.pagar(p.id, metodo), '¡Pago aprobado! Tu pedido quedó confirmado.')}
            >
              {procesando ? 'Procesando...' : 'Pagar ahora'}
            </button>
            <button
              className="btn btn-outline-danger"
              disabled={procesando}
              onClick={() => {
                if (window.confirm('¿Cancelar este pedido? Los productos volverán al inventario.')) {
                  ejecutar(() => pedidosApi.cambiarEstado(p.id, 'CANCELADO'), 'El pedido fue cancelado.')
                }
              }}
            >
              Cancelar pedido
            </button>
          </div>
          <p className="small text-secondary mt-2 mb-0">El pago es simulado: no se realiza ningún cobro real.</p>
        </div></section>
      )}
    </div>
  )
}
