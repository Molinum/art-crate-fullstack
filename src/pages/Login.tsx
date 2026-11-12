import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ErrorApi } from '../components/Estado'
import { useSesion } from '../context/SesionContext'
import { usuariosApi } from '../services/artcrate.service'

export function Login() {
  const { iniciar } = useSesion()
  const navegar = useNavigate()
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [verClave, setVerClave] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!/.+@.+\..+/.test(correo)) return setError('El correo no tiene un formato válido (ej: nombre@dominio.cl)')
    if (!password) return setError('La contraseña es obligatoria')
    try {
      iniciar(await usuariosApi.login(correo, password))
      navegar('/')
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <div className="container py-5" style={{ maxWidth: 480 }}>
      <h1 className="mb-4">Ingresar</h1>
      <form className="card formulario-card p-4" onSubmit={enviar} noValidate>
        <div className="mb-3">
          <label className="form-label" htmlFor="correo">Correo</label>
          <input id="correo" className="form-control" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} />
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="password">Contraseña</label>
          <div className="input-group">
            <input id="password" className="form-control" type={verClave ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" className="btn btn-outline-secondary" onClick={() => setVerClave(!verClave)}>
              {verClave ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
        </div>
        {error && <ErrorApi mensaje={error} />}
        <button className="btn btn-primary" type="submit">Ingresar</button>
        <p className="mt-3 mb-0 small">¿No tienes cuenta? <Link to="/registro">Regístrate</Link></p>
      </form>
    </div>
  )
}
