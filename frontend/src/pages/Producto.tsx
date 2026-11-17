import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Cargando, ErrorApi } from '../components/Estado'
import { useCarrito } from '../context/CarritoContext'
import { useSesion } from '../context/SesionContext'
import { useApi } from '../hooks'
import { carritoApi, catalogoApi, inventarioApi, precioCLP, unidadesCarrito, urlImagen } from '../services/artcrate.service'

export function Producto() {
  const { id } = useParams()
  const navegar = useNavigate()
  const { usuario } = useSesion()
  const { fijarCantidad } = useCarrito()
  const { datos: p, cargando, error } = useApi(() => catalogoApi.producto(Number(id)), [id])
  const stock = useApi(() => inventarioApi.deProducto(Number(id)), [id])
  const disponibles = stock.datos?.cantidad // undefined mientras carga o si falla
  // lo escrito en el campo se guarda como texto para poder borrarlo mientras se escribe; la cantidad real se corrige al enviar
  const [textoCantidad, setTextoCantidad] = useState('1')
  const cantidad = Math.min(Math.max(1, Math.floor(Number(textoCantidad)) || 1), disponibles || Infinity)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [errorAgregar, setErrorAgregar] = useState<string | null>(null)

  async function agregar() {
    if (!usuario) return navegar('/login')
    setMensaje(null)
    setErrorAgregar(null)
    try {
      fijarCantidad(unidadesCarrito(await carritoApi.agregar(usuario.id, Number(id), cantidad)))
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

          <h2 className="h5 mt-4">Ficha técnica</h2>
          <table className="table table-sm mb-4 ficha-tecnica">
            <tbody>
              {[
                ['Marca', p.marca],
                ['Formato', p.formato],
                ['Contenido', p.contenido],
                ['Categoría', p.categoriaNombre],
                ['SKU', p.sku],
              ].map(([nombre, valor]) => valor && (
                <tr key={nombre}>
                  <th scope="row">{nombre}</th>
                  <td>{valor}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {disponibles !== undefined && (
            <p className="mb-3">
              {!p.activo || disponibles === 0 ? (
                <span className="badge text-bg-secondary">No disponible</span>
              ) : disponibles <= 5 ? (
                <span className="badge text-bg-warning">¡Quedan {disponibles} unidades!</span>
              ) : (
                <span className="badge text-bg-success">Disponible</span>
              )}
            </p>
          )}

          <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
            <label htmlFor="cantidad" className="form-label mb-0">Cantidad</label>
            <input
              id="cantidad"
              className="form-control"
              style={{ width: 90 }}
              type="number"
              min={1}
              max={disponibles || undefined}
              value={textoCantidad}
              onChange={(e) => setTextoCantidad(e.target.value)}
              onBlur={() => setTextoCantidad(String(cantidad))}
            />
            <button className="btn btn-primary text-nowrap" onClick={agregar} disabled={!p.activo || disponibles === 0}>Agregar al carrito</button>
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
