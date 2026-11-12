import { useState } from 'react'

const MAX = 500

export function Contacto() {
  const [f, setF] = useState({ nombre: '', correo: '', asunto: '', mensaje: '' })
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [enviado, setEnviado] = useState(false)

  function validar() {
    const e: Record<string, string> = {}
    if (f.nombre.trim().length < 3) e.nombre = 'El nombre debe tener al menos 3 caracteres'
    if (!/.+@.+\..+/.test(f.correo)) e.correo = 'El correo no tiene un formato válido (ej: nombre@dominio.cl)'
    if (!f.asunto) e.asunto = 'Selecciona un asunto'
    if (f.mensaje.trim().length < 10 || f.mensaje.length > MAX) e.mensaje = `El mensaje debe tener entre 10 y ${MAX} caracteres`
    return e
  }

  function enviar(ev: React.FormEvent) {
    ev.preventDefault()
    const e = validar()
    setErrores(e)
    if (Object.keys(e).length === 0) {
      // el backend aún no tiene servicio de contacto: se confirma el envío en pantalla
      setEnviado(true)
      setF({ nombre: '', correo: '', asunto: '', mensaje: '' })
    }
  }

  const clase = (k: string) => `form-control ${errores[k] ? 'is-invalid' : ''}`

  return (
    <div className="container py-5">
      <h1 className="mb-4">Contacto</h1>
      <div className="row g-4">
        <section className="col-lg-5">
          <h2>Datos de la tienda</h2>
          <address>
            Av. Providencia 1234, Providencia, Santiago<br />
            <a href="mailto:contacto@artcrate.cl">contacto@artcrate.cl</a><br />
            <a href="tel:+56912345678">+56 9 1234 5678</a>
          </address>
          <p>Horario de atención: lunes a viernes, de 10:00 a 19:00 h.</p>
        </section>

        <section className="col-lg-7">
          <div className="card formulario-card"><div className="card-body p-4">
            <h2>Envíanos un mensaje</h2>
            {enviado && <div className="alert alert-success" role="status">¡Gracias! Recibimos tu mensaje y te responderemos pronto.</div>}
            <form onSubmit={enviar} noValidate>
              <div className="mb-3">
                <label className="form-label" htmlFor="nombre">Nombre</label>
                <input id="nombre" className={clase('nombre')} value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} />
                <div className="invalid-feedback">{errores.nombre}</div>
              </div>
              <div className="mb-3">
                <label className="form-label" htmlFor="correo">Correo electrónico</label>
                <input id="correo" type="email" className={clase('correo')} value={f.correo} onChange={(e) => setF({ ...f, correo: e.target.value })} />
                <div className="invalid-feedback">{errores.correo}</div>
              </div>
              <div className="mb-3">
                <label className="form-label" htmlFor="asunto">Asunto</label>
                <select id="asunto" className={`form-select ${errores.asunto ? 'is-invalid' : ''}`} value={f.asunto} onChange={(e) => setF({ ...f, asunto: e.target.value })}>
                  <option value="">Selecciona un asunto</option>
                  <option value="consulta-producto">Consulta sobre un producto</option>
                  <option value="pedido">Estado de mi pedido</option>
                  <option value="devolucion">Cambios y devoluciones</option>
                  <option value="otro">Otro</option>
                </select>
                <div className="invalid-feedback">{errores.asunto}</div>
              </div>
              <div className="mb-3">
                <label className="form-label" htmlFor="mensaje">Mensaje</label>
                <textarea id="mensaje" rows={6} className={clase('mensaje')} value={f.mensaje} onChange={(e) => setF({ ...f, mensaje: e.target.value })} />
                <div className="invalid-feedback">{errores.mensaje}</div>
                <div className="form-text">{f.mensaje.length} / {MAX} caracteres</div>
              </div>
              <button type="submit" className="btn btn-primary w-100">Enviar mensaje</button>
            </form>
          </div></div>
        </section>
      </div>
    </div>
  )
}
