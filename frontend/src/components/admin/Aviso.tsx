// Mensaje de éxito después de una acción del panel
export function Aviso({ texto, onCerrar }: { texto: string | null; onCerrar: () => void }) {
  if (!texto) return null
  return (
    <div className="alert alert-success alert-dismissible" role="status">
      {texto}
      <button type="button" className="btn-close" aria-label="Cerrar aviso" onClick={onCerrar} />
    </div>
  )
}
