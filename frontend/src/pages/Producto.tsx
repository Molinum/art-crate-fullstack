import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Cargando, ErrorApi } from '../components/Estado'
import { useSesion } from '../context/SesionContext'
import { useApi } from '../hooks'
import { carritoApi, catalogoApi, precioCLP, urlImagen } from '../services/artcrate.service'

export function Producto() {
  const { id } = useParams()
  const navegar = useNavigate()
  const { usuario } = useSesion()
  const { datos: p, cargando, error } = useApi(() => catalogoApi.producto(Number(id)), [id])
  const [cantidad, setCantidad] = useState(1)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [errorAgregar, setErrorAgregar] = useState<string | null>(null)

  async function agregar() {
    if (!usuario) return navegar('/login')
    setMensaje(null)
    setErrorAgregar(null)
    try {
      await carritoApi.agregar(usuario.id, Number(id), cantidad)
      setMensaje('Producto agregado al carrito')
    } catch (e) {
      setErrorAgregar((e as Error).message)
    }
  }

  if (cargando) return <Cargando />
  if (error || !p) return <div className="container py-5"><ErrorApi mensaje={error ?? 'Producto no encontrado'} /></div>

  return (
    <div className="container py-5">
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><Link to="/catalogo">Catálogo</Link></li>
          <li className="breadcrumb-item active">{p.nombre}</li>
        </ol>
      </nav>
      <div className="row g-4 gx-lg-5">
        <div className="col-md-6">
          <img className="detalle-imagen img-fluid" src={urlImagen(p.imagenUrl)} alt={p.nombre} />
        </div>
        <div className="col-md-6">
          <p className="text-muted mb-1">{p.categoriaNombre} · {p.sku}</p>
          <h1>{p.nombre}</h1>
          <p className="precio precio-detalle">{precioCLP(p.precio)}</p>
          <p>{p.descripcion}</p>

          <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
            <label htmlFor="cantidad" className="form-label mb-0">Cantidad</label>
            <input
              id="cantidad"
              className="form-control"
              style={{ width: 90 }}
              type="number"
              min={1}
              value={cantidad}
              onChange={(e) => setCantidad(Math.max(1, Number(e.target.value)))}
            />
            <button className="btn btn-primary text-nowrap" onClick={agregar}>Agregar al carrito</button>
          </div>
          {mensaje && (
            <div className="alert alert-success">
              {mensaje}. <Link to="/carrito">Ver carrito</Link>
            </div>
          )}
          {errorAgregar && <ErrorApi mensaje={errorAgregar} />}
        </div>
      </div>
    </div>
  )
}
