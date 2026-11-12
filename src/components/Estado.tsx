// Mensajes de carga y error reutilizables
export function Cargando() {
  return <p className="text-center py-5">Cargando...</p>
}

export function ErrorApi({ mensaje }: { mensaje: string }) {
  return <div className="alert alert-danger" role="alert">{mensaje}</div>
}
