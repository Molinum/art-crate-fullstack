import { useState } from 'react'

export interface Confirmacion {
  titulo: string
  mensaje: string
  boton: string
  peligro?: boolean // acción delicada: el botón se pinta de rojo
}

// Reemplaza a window.confirm por un cuadro con el estilo de la tienda.
// Uso: const [confirmar, dialogo] = useConfirmar(); if (await confirmar({...})) ...  y dibujar {dialogo}
export function useConfirmar() {
  const [actual, setActual] = useState<(Confirmacion & { responder: (si: boolean) => void }) | null>(null)

  const confirmar = (c: Confirmacion) => new Promise<boolean>((responder) => setActual({ ...c, responder }))

  function cerrar(si: boolean) {
    actual?.responder(si)
    setActual(null)
  }

  // showModal deja el foco dentro del cuadro y permite cerrarlo con Escape
  const abrir = (d: HTMLDialogElement | null) => {
    if (!d || d.open) return
    if (d.showModal) d.showModal()
    else d.setAttribute('open', '')
  }

  const dialogo = actual && (
    <dialog ref={abrir} className="dialogo-confirmar" aria-labelledby="confirmar-titulo" onCancel={() => cerrar(false)}>
      <h2 id="confirmar-titulo" className="h5">{actual.titulo}</h2>
      <p>{actual.mensaje}</p>
      <div className="d-flex justify-content-end gap-2">
        <button type="button" className="btn btn-outline-secondary" onClick={() => cerrar(false)}>Volver</button>
        <button type="button" className={`btn ${actual.peligro ? 'btn-danger' : 'btn-primary'}`} onClick={() => cerrar(true)}>{actual.boton}</button>
      </div>
    </dialog>
  )

  return [confirmar, dialogo] as const
}
