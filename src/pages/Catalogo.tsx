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

  const categorias = useApi(catalogoApi.categorias, [])
  const productos = useApi(() => catalogoApi.productos(categoriaId, q || undefined), [categoriaId, q])

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

      <form className="d-flex gap-2 mb-4" onSubmit={buscar}>
        <input
          className="form-control"
          type="search"
          placeholder="Buscar producto"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <button className="btn btn-primary" type="submit">Buscar</button>
      </form>

      {productos.cargando && <Cargando />}
      {productos.error && <ErrorApi mensaje={productos.error} />}
      {productos.datos?.length === 0 && <p>No hay productos que coincidan.</p>}
      <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-4 g-4">
        {productos.datos?.map((p) => <TarjetaProducto key={p.id} producto={p} />)}
      </div>
    </div>
  )
}
