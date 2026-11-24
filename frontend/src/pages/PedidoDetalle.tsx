import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { DetallePedido } from '../components/DetallePedido'
import { Cargando, ErrorApi } from '../components/Estado'
import { FormularioPago } from '../components/FormularioPago'
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

  const pago = pagos.datos?.find((x) => x.estado === 'APROBADO') ?? null
  const rechazados = (pagos.datos ?? []).filter((x) => x.estado === 'RECHAZADO')

  // Pago simulado: una pequeña espera hace visible el "procesando". Un rechazo del banco no es un error de la app.
  async function pagar(metodo: MetodoPago, ultimosDigitos?: string) {
    setProcesando(true)
    setAviso(null)
    setErrorAccion(null)
    try {
      await new Promise((r) => setTimeout(r, 1200))
      const resultado = await pagosApi.pagar(p.id, metodo, ultimosDigitos)
      if (resultado.estado === 'RECHAZADO') {
        setErrorAccion(`Pago rechazado: ${resultado.motivoRechazo ?? 'el banco no autorizó el pago'}. Puedes intentarlo con otra tarjeta o pagar por transferencia.`)
      } else {
        setAviso('¡Pago aprobado! Tu pedido quedó confirmado.')
      }
      setVersion((v) => v + 1)
    } catch (e) {
      setErrorAccion((e as Error).message)
    } finally {
      setProcesando(false)
    }
  }

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
        <>
          <FormularioPago pedidoId={p.id} total={p.total} procesando={procesando} onPagar={pagar} />
          {rechazados.length > 0 && (
            <p className="small text-secondary mt-3 mb-0">Intentos de pago rechazados: {rechazados.length}</p>
          )}
          <button
            className="btn btn-outline-danger mt-3"
            disabled={procesando}
            onClick={() => {
              if (window.confirm('¿Cancelar este pedido? Los productos volverán al inventario.')) {
                ejecutar(() => pedidosApi.cambiarEstado(p.id, 'CANCELADO'), 'El pedido fue cancelado.')
              }
            }}
          >
            Cancelar pedido
          </button>
        </>
      )}
    </div>
  )
}
