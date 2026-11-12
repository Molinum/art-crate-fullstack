import { useState } from 'react'
import '../App.css'
import {
  API_URL,
  ENDPOINTS,
  llamarApi,
  type Metodo,
  type Respuesta,
} from '../services/api.service'

const METODOS: Metodo[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

export function PruebaApi() {
  const [base, setBase] = useState(API_URL)
  const [metodo, setMetodo] = useState<Metodo>('GET')
  const [ruta, setRuta] = useState('/api/productos')
  const [cuerpo, setCuerpo] = useState('')
  const [cargando, setCargando] = useState(false)
  const [respuesta, setRespuesta] = useState<Respuesta | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function enviar(m: Metodo, r: string, c?: string) {
    setCargando(true)
    setError(null)
    setRespuesta(null)
    try {
      setRespuesta(await llamarApi(base, m, r, c))
    } catch {
      setError(
        'No se pudo completar la solicitud. Inténtalo nuevamente.',
      )
    } finally {
      setCargando(false)
    }
  }

  function elegir(m: Metodo, r: string, c = '') {
    setMetodo(m)
    setRuta(r)
    setCuerpo(c)
    enviar(m, r, c)
  }

  return (
    <main>
      <h1>ArtCrate · prueba de API</h1>

      <label>
        Gateway
        <input value={base} onChange={(e) => setBase(e.target.value)} />
      </label>

      <section>
        <h2>Atajos</h2>
        <div className="atajos">
          {ENDPOINTS.map((ep) => (
            <button key={ep.ruta} onClick={() => elegir(ep.metodo, ep.ruta, ep.cuerpo)}>
              {ep.etiqueta}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2>Petición personalizada</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            enviar(metodo, ruta, cuerpo)
          }}
        >
          <div className="fila">
            <select value={metodo} onChange={(e) => setMetodo(e.target.value as Metodo)}>
              {METODOS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
            <input value={ruta} onChange={(e) => setRuta(e.target.value)} />
            <button type="submit" disabled={cargando}>
              Enviar
            </button>
          </div>
          <textarea
            placeholder="Cuerpo JSON (solo POST, PUT y PATCH)"
            rows={5}
            value={cuerpo}
            onChange={(e) => setCuerpo(e.target.value)}
          />
        </form>
      </section>

      <section>
        <h2>Respuesta</h2>
        {cargando && <p>Cargando...</p>}
        {error && <p className="error">{error}</p>}
        {respuesta && (
          <>
            <p className={respuesta.ok ? 'ok' : 'error'}>
              {respuesta.status} {respuesta.statusText} · {respuesta.ms} ms
            </p>
            <pre>
              {typeof respuesta.datos === 'string'
                ? respuesta.datos
                : JSON.stringify(respuesta.datos, null, 2)}
            </pre>
          </>
        )}
      </section>
    </main>
  )
}

