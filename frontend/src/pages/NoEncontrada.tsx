import { Link } from 'react-router-dom'

export function NoEncontrada() {
  return (
    <div className="container py-5 text-center">
      <h1 className="mb-3">Página no encontrada</h1>
      <p className="mb-4">La dirección que buscas no existe o fue movida.</p>
      <Link className="btn btn-primary" to="/">Volver al inicio</Link>
    </div>
  )
}
