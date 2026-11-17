import type { ReactNode } from 'react'

interface Props {
  id: string
  etiqueta: string
  error?: string
  ayuda?: string
  className?: string
  children: ReactNode
}

// Etiqueta + control + mensaje de error (o ayuda) debajo, para todos los formularios
export function Campo({ id, etiqueta, error, ayuda, className = '', children }: Props) {
  return (
    <div className={className}>
      <label className="form-label" htmlFor={id}>{etiqueta}</label>
      {children}
      {error ? (
        <div className="invalid-feedback d-block" role="alert">{error}</div>
      ) : ayuda ? (
        <div className="form-text">{ayuda}</div>
      ) : null}
    </div>
  )
}
