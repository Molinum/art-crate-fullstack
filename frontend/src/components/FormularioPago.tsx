import { useState } from 'react'
import { formatearNumero, formatearVencimiento, luhnValido, vencimientoValido } from '../data/tarjeta'
import { precioCLP } from '../services/artcrate.service'
import type { MetodoPago } from '../types'

interface Props {
  pedidoId: number
  total: number
  procesando: boolean
  onPagar: (metodo: MetodoPago, ultimosDigitos?: string) => void
}

const TARJETAS_PRUEBA = [
  { numero: '4242 4242 4242 4242', resultado: 'Pago aprobado' },
  { numero: '4000 0000 0000 0002', resultado: 'Tarjeta rechazada por el banco' },
  { numero: '4000 0000 0000 9995', resultado: 'Fondos insuficientes' },
]

// Pago simulado: tarjeta (con validaciones) o transferencia (con los datos para transferir)
export function FormularioPago({ pedidoId, total, procesando, onPagar }: Props) {
  const [metodo, setMetodo] = useState<MetodoPago>('TARJETA')
  const [numero, setNumero] = useState('')
  const [nombre, setNombre] = useState('')
  const [vence, setVence] = useState('')
  const [cvv, setCvv] = useState('')
  const [errores, setErrores] = useState<Record<string, string>>({})

  const cambiarNumero = (v: string) => setNumero(formatearNumero(v))
  const cambiarVence = (v: string) => setVence(formatearVencimiento(v))

  function enviarTarjeta(e: React.FormEvent) {
    e.preventDefault()
    const digitos = numero.replace(/\s/g, '')
    const nuevos: Record<string, string> = {}
    if (digitos.length !== 16 || !luhnValido(digitos)) nuevos.numero = 'El número de la tarjeta no es válido'
    if (nombre.trim().length < 3) nuevos.nombre = 'Ingresa el nombre que aparece en la tarjeta'
    if (!vencimientoValido(vence)) nuevos.vence = 'Fecha inválida o vencida (MM/AA)'
    if (!/^\d{3}$/.test(cvv)) nuevos.cvv = 'El CVV tiene 3 dígitos'
    setErrores(nuevos)
    if (Object.keys(nuevos).length === 0) onPagar('TARJETA', digitos.slice(-4))
  }

  const campo = (clave: string) => (errores[clave] ? 'form-control is-invalid' : 'form-control')

  return (
    <section className="card formulario-card mt-4"><div className="card-body">
      <h2 className="h5">Pagar el pedido · {precioCLP(total)}</h2>
      <ul className="nav nav-pills gap-2 mb-3">
        {([['TARJETA', 'Tarjeta'], ['TRANSFERENCIA', 'Transferencia']] as const).map(([clave, texto]) => (
          <li className="nav-item" key={clave}>
            <button type="button" className={`nav-link ${metodo === clave ? 'active' : ''}`} onClick={() => setMetodo(clave)}>{texto}</button>
          </li>
        ))}
      </ul>

      {metodo === 'TARJETA' ? (
        <form onSubmit={enviarTarjeta} noValidate style={{ maxWidth: 480 }}>
          <div className="mb-3">
            <label className="form-label" htmlFor="tarjeta-numero">Número de tarjeta</label>
            <input id="tarjeta-numero" className={campo('numero')} inputMode="numeric" autoComplete="cc-number" placeholder="0000 0000 0000 0000" value={numero} onChange={(e) => cambiarNumero(e.target.value)} />
            {errores.numero && <div className="invalid-feedback">{errores.numero}</div>}
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="tarjeta-nombre">Nombre en la tarjeta</label>
            <input id="tarjeta-nombre" className={campo('nombre')} autoComplete="cc-name" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            {errores.nombre && <div className="invalid-feedback">{errores.nombre}</div>}
          </div>
          <div className="row g-3 mb-3">
            <div className="col-6">
              <label className="form-label" htmlFor="tarjeta-vence">Vencimiento</label>
              <input id="tarjeta-vence" className={campo('vence')} inputMode="numeric" autoComplete="cc-exp" placeholder="MM/AA" value={vence} onChange={(e) => cambiarVence(e.target.value)} />
              {errores.vence && <div className="invalid-feedback">{errores.vence}</div>}
            </div>
            <div className="col-6">
              <label className="form-label" htmlFor="tarjeta-cvv">CVV</label>
              <input id="tarjeta-cvv" className={campo('cvv')} inputMode="numeric" autoComplete="cc-csc" placeholder="123" value={cvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 3))} />
              {errores.cvv && <div className="invalid-feedback">{errores.cvv}</div>}
            </div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={procesando}>{procesando ? 'Procesando pago...' : `Pagar ${precioCLP(total)}`}</button>

          <details className="mt-3 small">
            <summary>Tarjetas de prueba</summary>
            <p className="text-secondary mt-2 mb-1">Usa cualquier nombre, un vencimiento futuro y cualquier CVV:</p>
            <ul className="mb-0">
              {TARJETAS_PRUEBA.map((t) => <li key={t.numero}><code>{t.numero}</code> → {t.resultado}</li>)}
            </ul>
          </details>
        </form>
      ) : (
        <div style={{ maxWidth: 480 }}>
          <p>Transfiere el total del pedido a esta cuenta y luego confirma el pago:</p>
          <dl className="row small mb-3">
            <dt className="col-5">Banco</dt><dd className="col-7">Banco ArtCrate (simulado)</dd>
            <dt className="col-5">Tipo de cuenta</dt><dd className="col-7">Cuenta corriente</dd>
            <dt className="col-5">N° de cuenta</dt><dd className="col-7">000-12345-67</dd>
            <dt className="col-5">Titular</dt><dd className="col-7">ArtCrate SpA</dd>
            <dt className="col-5">RUT</dt><dd className="col-7">76.000.000-0</dd>
            <dt className="col-5">Correo</dt><dd className="col-7">pagos@artcrate.cl</dd>
            <dt className="col-5">Monto</dt><dd className="col-7 fw-semibold">{precioCLP(total)}</dd>
            <dt className="col-5">Glosa</dt><dd className="col-7 mb-0"><code>ARTCRATE-{pedidoId}</code></dd>
          </dl>
          <button className="btn btn-primary" disabled={procesando} onClick={() => onPagar('TRANSFERENCIA')}>
            {procesando ? 'Verificando transferencia...' : 'Ya realicé la transferencia'}
          </button>
        </div>
      )}
      <p className="small text-secondary mt-3 mb-0">El pago es simulado: no se realiza ningún cobro real y el número de tarjeta no sale de tu navegador (solo se envían los últimos 4 dígitos).</p>
    </div></section>
  )
}
