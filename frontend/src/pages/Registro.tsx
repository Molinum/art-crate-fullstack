import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Campo } from '../components/Campo'
import { ErrorApi } from '../components/Estado'
import { SelectorRegionComuna } from '../components/SelectorRegionComuna'
import { useSesion } from '../context/SesionContext'
import { usuariosApi } from '../services/artcrate.service'

const INICIAL = { nombre: '', apellido: '', correo: '', password: '', confirmar: '', telefono: '', region: '', comuna: '', terminos: false }
type Valores = typeof INICIAL
type Campos = keyof Valores
type Errores = Partial<Record<Campos, string>>

// Orden en que aparecen los campos: sirve para llevar el foco al primero con error
const ORDEN: Campos[] = ['nombre', 'apellido', 'correo', 'password', 'confirmar', 'telefono', 'region', 'comuna', 'terminos']

const REQUISITOS_CLAVE = [
  { texto: 'Mínimo 8 caracteres', cumple: (p: string) => p.length >= 8 },
  { texto: 'Una letra mayúscula', cumple: (p: string) => /[A-Z]/.test(p) },
  { texto: 'Un número', cumple: (p: string) => /[0-9]/.test(p) },
]

function validar(v: Valores): Errores {
  const e: Errores = {}
  if (v.nombre.trim().length < 2) e.nombre = 'Ingresa tu nombre'
  if (v.apellido.trim().length < 2) e.apellido = 'Ingresa tu apellido'
  if (!/.+@.+\..+/.test(v.correo)) e.correo = 'Ingresa un correo válido (ej: nombre@dominio.cl)'
  const faltan = REQUISITOS_CLAVE.filter((r) => !r.cumple(v.password)).map((r) => r.texto.toLowerCase())
  if (faltan.length) e.password = `La contraseña necesita: ${faltan.join(', ')}`
  if (v.confirmar !== v.password) e.confirmar = 'Las contraseñas no coinciden'
  if (v.telefono && !/^\d{8}$/.test(v.telefono)) e.telefono = 'Ingresa los 8 dígitos que siguen al +56 9'
  if (!v.region) e.region = 'Selecciona tu región'
  if (v.region && !v.comuna) e.comuna = 'Selecciona tu comuna'
  if (!v.terminos) e.terminos = 'Debes aceptar los términos y condiciones'
  return e
}

export function Registro() {
  const { iniciar } = useSesion()
  const navegar = useNavigate()
  const [v, setV] = useState<Valores>(INICIAL)
  const [tocados, setTocados] = useState<Campos[]>([]) // campos que el usuario ya visitó
  const [intentado, setIntentado] = useState(false) // true tras pulsar "Crear cuenta"
  const [verClave, setVerClave] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [errorApi, setErrorApi] = useState<string | null>(null)

  // Los errores no se guardan: se calculan a partir de los valores en cada dibujado
  const todos = validar(v)
  const error = (c: Campos) => (intentado || tocados.includes(c) ? todos[c] : undefined)
  const tocar = (c: Campos) => setTocados((t) => (t.includes(c) ? t : [...t, c]))
  const cambiar = (c: Campos, valor: string | boolean) => setV((prev) => ({ ...prev, [c]: valor }))
  const clase = (c: Campos) => `form-control ${error(c) ? 'is-invalid' : ''}`

  const cumplidos = REQUISITOS_CLAVE.filter((r) => r.cumple(v.password)).length
  const colorBarra = ['bg-danger', 'bg-danger', 'bg-warning', 'bg-success'][cumplidos]

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setIntentado(true)
    const primero = ORDEN.find((c) => todos[c])
    if (primero) {
      document.getElementById(`reg-${primero}`)?.focus()
      return
    }
    setEnviando(true)
    setErrorApi(null)
    try {
      const usuario = await usuariosApi.registro({
        nombre: v.nombre.trim(),
        apellido: v.apellido.trim(),
        correo: v.correo.trim(),
        password: v.password,
        telefono: v.telefono ? `+569${v.telefono}` : undefined,
        region: v.region,
      })
      iniciar({ ...usuario, comuna: v.comuna })
      navegar('/')
    } catch (err) {
      setErrorApi((err as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="container py-5" style={{ maxWidth: 640 }}>
      <h1 className="mb-4">Crear cuenta</h1>
      <form className="card formulario-card p-4" onSubmit={enviar} noValidate>
        <div className="row g-3">
          <Campo id="reg-nombre" etiqueta="Nombre" error={error('nombre')} className="col-md-6">
            <input id="reg-nombre" className={clase('nombre')} autoComplete="given-name" value={v.nombre}
              onChange={(e) => cambiar('nombre', e.target.value)} onBlur={() => tocar('nombre')} />
          </Campo>
          <Campo id="reg-apellido" etiqueta="Apellido" error={error('apellido')} className="col-md-6">
            <input id="reg-apellido" className={clase('apellido')} autoComplete="family-name" value={v.apellido}
              onChange={(e) => cambiar('apellido', e.target.value)} onBlur={() => tocar('apellido')} />
          </Campo>
          <Campo id="reg-correo" etiqueta="Correo electrónico" error={error('correo')} className="col-12">
            <input id="reg-correo" type="email" className={clase('correo')} autoComplete="email" value={v.correo}
              onChange={(e) => cambiar('correo', e.target.value)} onBlur={() => tocar('correo')} />
          </Campo>

          <Campo id="reg-password" etiqueta="Contraseña" error={error('password')} className="col-md-6">
            <input id="reg-password" type={verClave ? 'text' : 'password'} className={clase('password')} autoComplete="new-password"
              value={v.password} onChange={(e) => cambiar('password', e.target.value)} onBlur={() => tocar('password')} />
            <div className="progress mt-2" style={{ height: 6 }} aria-hidden="true">
              <div className={`progress-bar ${colorBarra}`} style={{ width: `${(cumplidos / REQUISITOS_CLAVE.length) * 100}%` }} />
            </div>
            <ul className="list-unstyled small mt-2 mb-0">
              {REQUISITOS_CLAVE.map((r) => (
                <li key={r.texto} className={r.cumple(v.password) ? 'text-success' : 'text-secondary'}>
                  {r.cumple(v.password) ? '✓' : '○'} {r.texto}
                </li>
              ))}
            </ul>
          </Campo>
          <Campo id="reg-confirmar" etiqueta="Confirmar contraseña" error={error('confirmar')} className="col-md-6">
            <input id="reg-confirmar" type={verClave ? 'text' : 'password'} className={clase('confirmar')} autoComplete="new-password"
              value={v.confirmar} onChange={(e) => cambiar('confirmar', e.target.value)} onBlur={() => tocar('confirmar')} />
            <button type="button" className="btn btn-link btn-sm px-0 mt-1" onClick={() => setVerClave(!verClave)}>
              {verClave ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
            </button>
          </Campo>

          <Campo id="reg-telefono" etiqueta="Teléfono (opcional)" error={error('telefono')} className="col-12">
            <div className="input-group">
              <span className="input-group-text">+56 9</span>
              <input id="reg-telefono" inputMode="numeric" maxLength={8} placeholder="12345678"
                className={clase('telefono')} autoComplete="tel-national" value={v.telefono}
                onChange={(e) => cambiar('telefono', e.target.value.replace(/\D/g, ''))} onBlur={() => tocar('telefono')} />
            </div>
          </Campo>

          <SelectorRegionComuna
            idBase="reg"
            region={v.region}
            comuna={v.comuna}
            onChange={(region, comuna) => setV((prev) => ({ ...prev, region, comuna }))}
            errorRegion={error('region')}
            errorComuna={error('comuna')}
            onTocar={tocar}
          />

          <div className="col-12">
            <div className="form-check">
              <input id="reg-terminos" type="checkbox" className={`form-check-input ${error('terminos') ? 'is-invalid' : ''}`}
                checked={v.terminos} onChange={(e) => { cambiar('terminos', e.target.checked); tocar('terminos') }} />
              <label className="form-check-label" htmlFor="reg-terminos">Acepto los términos y condiciones</label>
            </div>
            {error('terminos') && <div className="invalid-feedback d-block" role="alert">{error('terminos')}</div>}
          </div>
        </div>

        {errorApi && <div className="mt-3"><ErrorApi mensaje={errorApi} /></div>}
        <button className="btn btn-primary mt-3 align-self-start" type="submit" disabled={enviando}>
          {enviando ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>
      </form>
    </div>
  )
}
