import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ErrorApi } from '../components/Estado'
import { useSesion } from '../context/SesionContext'
import { usuariosApi } from '../services/artcrate.service'

// Mismas reglas que el formulario original (E1) y que el backend
function validar(f: Record<string, string>): string | null {
  if (!f.nombre.trim() || !f.apellido.trim()) return 'Nombre y apellido son obligatorios'
  if (!/.+@.+\..+/.test(f.correo)) return 'El correo no tiene un formato válido (ej: nombre@dominio.cl)'
  if (!/^(?=.*[A-Z])(?=.*[0-9]).{8,}$/.test(f.password))
    return 'La contraseña debe tener mínimo 8 caracteres, una mayúscula y un número'
  if (f.password !== f.confirmar) return 'Las contraseñas no coinciden'
  if (f.telefono && !/^\+569\d{8}$/.test(f.telefono)) return 'El teléfono debe tener el formato +569XXXXXXXX'
  return null
}

export function Registro() {
  const { iniciar } = useSesion()
  const navegar = useNavigate()
  const [f, setF] = useState({ nombre: '', apellido: '', correo: '', password: '', confirmar: '', telefono: '', region: '' })
  const [error, setError] = useState<string | null>(null)

  const campo = (k: keyof typeof f) => ({
    value: f[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value }),
  })

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    const msg = validar(f)
    if (msg) return setError(msg)
    setError(null)
    try {
      const { nombre, apellido, correo, password, telefono, region } = f
      iniciar(await usuariosApi.registro({ nombre, apellido, correo, password, telefono, region }))
      navegar('/')
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <div className="container py-5" style={{ maxWidth: 560 }}>
      <h1 className="mb-4">Crear cuenta</h1>
      <form className="card formulario-card p-4" onSubmit={enviar} noValidate>
        <div className="row g-3">
          <div className="col-md-6"><label className="form-label">Nombre</label><input className="form-control" {...campo('nombre')} /></div>
          <div className="col-md-6"><label className="form-label">Apellido</label><input className="form-control" {...campo('apellido')} /></div>
          <div className="col-12"><label className="form-label">Correo</label><input className="form-control" type="email" {...campo('correo')} /></div>
          <div className="col-md-6"><label className="form-label">Contraseña</label><input className="form-control" type="password" {...campo('password')} /></div>
          <div className="col-md-6"><label className="form-label">Confirmar contraseña</label><input className="form-control" type="password" {...campo('confirmar')} /></div>
          <div className="col-md-6"><label className="form-label">Teléfono (opcional)</label><input className="form-control" placeholder="+56912345678" {...campo('telefono')} /></div>
          <div className="col-md-6"><label className="form-label">Región (opcional)</label><input className="form-control" {...campo('region')} /></div>
        </div>
        {error && <div className="mt-3"><ErrorApi mensaje={error} /></div>}
        <button className="btn btn-primary mt-3" type="submit">Registrarme</button>
      </form>
    </div>
  )
}
