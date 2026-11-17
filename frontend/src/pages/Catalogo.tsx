import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Cargando, ErrorApi } from '../components/Estado'
import { TarjetaProducto } from '../components/TarjetaProducto'
import { useApi } from '../hooks'
import { catalogoApi } from '../services/artcrate.service'

export function Catalogo() {
  const [params, setParams] = useSearchParams()
  const categoriaId = Number(params.get('categoria')) || undefined
  const q = params.get('q') ?? ''
  const [texto, setTexto] = useState(q)
  const [orden, setOrden] = useState('')

  const categorias = useApi(catalogoApi.categorias, [])
  const productos = useApi(() => catalogoApi.productos(categoriaId, q || undefined), [categoriaId, q])

  // la tienda solo muestra productos activos; el orden se aplica en el navegador
  const lista = (productos.datos ?? [])
    .filter((p) => p.activo)
    .sort((a, b) =>
      orden === 'precio-asc' ? a.precio - b.precio
      : orden === 'precio-desc' ? b.precio - a.precio
      : orden === 'nombre' ? a.nombre.localeCompare(b.nombre, 'es')
      : 0,
    )

  function elegir(id?: number) {
    const nuevo = new URLSearchParams(params)
    if (id) nuevo.set('categoria', String(id))
    else nuevo.delete('categoria')
    setParams(nuevo)
  }

  function buscar(e: React.FormEvent) {
    e.preventDefault()
    const nuevo = new URLSearchParams(params)
    if (texto.trim()) nuevo.set('q', texto.trim())
    else nuevo.delete('q')
    setParams(nuevo)
  }

  return (
    <div className="container py-5">
      <span className="etiqueta mb-2">Tienda</span>
      <h1 className="mb-4">Catálogo</h1>

      <ul className="nav nav-pills mb-3 gap-2">
        <li className="nav-item">
          <button className={`nav-link ${!categoriaId ? 'active' : ''}`} onClick={() => elegir()}>Todos</button>
        </li>
        {categorias.datos?.map((c) => (
          <li className="nav-item" key={c.id}>
            <button className={`nav-link ${categoriaId === c.id ? 'active' : ''}`} onClick={() => elegir(c.id)}>
              {c.nombre}
            </button>
          </li>
        ))}
      </ul>

      <form className="d-flex flex-wrap gap-2 mb-4" onSubmit={buscar}>
        <input
          className="form-control"
          type="search"
          placeholder="Buscar producto"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <button className="btn btn-primary" type="submit">Buscar</button>
        <select className="form-select w-auto" aria-label="Ordenar productos" value={orden} onChange={(e) => setOrden(e.target.value)}>
          <option value="">Orden predeterminado</option>
          <option value="precio-asc">Precio: menor a mayor</option>
          <option value="precio-desc">Precio: mayor a menor</option>
          <option value="nombre">Nombre (A-Z)</option>
        </select>
      </form>

      {productos.cargando && <Cargando />}
      {productos.error && <ErrorApi mensaje={productos.error} />}
      {productos.datos && <p className="text-secondary small">{lista.length} {lista.length === 1 ? 'producto' : 'productos'}</p>}
      {productos.datos && lista.length === 0 && <p>No hay productos que coincidan.</p>}
      <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-4 g-4">
        {lista.map((p) => <TarjetaProducto key={p.id} producto={p} />)}
      </div>
    </div>
  )
}
