import { Link } from 'react-router-dom'
import { precioCLP, urlImagen } from '../services/artcrate.service'
import type { Producto } from '../types'

export function TarjetaProducto({ producto }: { producto: Producto }) {
  return (
    <div className="col">
      <article className="card h-100 tarjeta-producto">
        <img src={urlImagen(producto.imagenUrl)} className="card-img-top" alt={producto.nombre} width="300" height="300" />
        <div className="card-body">
          <span className="categoria">{producto.categoriaNombre}</span>
          <h3 className="card-title">
            <Link className="stretched-link" to={`/producto/${producto.id}`}>{producto.nombre}</Link>
          </h3>
          <p className="card-text precio">{precioCLP(producto.precio)}</p>
        </div>
      </article>
    </div>
  )
}
