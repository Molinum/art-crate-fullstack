import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Cargando, ErrorApi } from '../../components/Estado'
import { STOCK_BAJO } from '../../data/negocio'
import { useApi } from '../../hooks'
import { catalogoApi, inventarioApi, precioCLP, productoARequest } from '../../services/artcrate.service'
import type { Producto } from '../../types'

const FILTROS = [
  { clave: '', texto: 'Todos' },
  { clave: 'activos', texto: 'Activos' },
  { clave: 'inactivos', texto: 'Inactivos' },
  { clave: 'stock-bajo', texto: 'Stock bajo' },
]

export function Productos() {
  const [params, setParams] = useSearchParams()
  const filtro = params.get('filtro') ?? ''
  const [version, setVersion] = useState(0)
  const [busqueda, setBusqueda] = useState('')
  const [errorAccion, setErrorAccion] = useState<string | null>(null)
  const productos = useApi(() => catalogoApi.productos(), [version])
  const stock = useApi(inventarioApi.todos, [version])

  const unidades = (id: number) => stock.datos?.find((s) => s.productoId === id)?.cantidad ?? 0
  const cumple = (p: Producto, clave: string) =>
    clave === 'activos' ? p.activo
    : clave === 'inactivos' ? !p.activo
    : clave === 'stock-bajo' ? p.activo && unidades(p.id) <= STOCK_BAJO
    : true
  const texto = busqueda.trim().toLowerCase()
  const lista = (productos.datos ?? [])
    .filter((p) => cumple(p, filtro))
    .filter((p) => !texto || `${p.sku} ${p.nombre} ${p.categoriaNombre}`.toLowerCase().includes(texto))

  // Los productos no se eliminan (pueden estar en pedidos ya vendidos): se activan o desactivan
  async function cambiarEstado(p: Producto) {
    setErrorAccion(null)
    try {
      await catalogoApi.actualizar(p.id, productoARequest(p, !p.activo))
      setVersion((v) => v + 1)
    } catch (e) {
      setErrorAccion((e as Error).message)
    }
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="mb-0">Productos</h1>
        <Link className="btn btn-primary" to="/admin/productos/nuevo">Nuevo producto</Link>
      </div>
      <p className="text-secondary small">
        Los productos no se eliminan, para conservar el historial de los pedidos ya vendidos. Si no quieres que se vendan, desactívalos y dejarán de mostrarse en la tienda.
      </p>

      <input
        className="form-control mb-3" style={{ maxWidth: 320 }} type="search" placeholder="Buscar por nombre, SKU o categoría"
        aria-label="Buscar producto" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
      />
      <ul className="nav nav-pills mb-3 gap-2">
        {FILTROS.map((f) => (
          <li className="nav-item" key={f.clave}>
            <button
              className={`nav-link ${filtro === f.clave ? 'active' : ''}`}
              onClick={() => setParams(f.clave ? { filtro: f.clave } : {})}
            >
              {f.texto} ({(productos.datos ?? []).filter((p) => cumple(p, f.clave)).length})
            </button>
          </li>
        ))}
      </ul>

      {productos.cargando && !productos.datos && <Cargando />}
      {(productos.error ?? errorAccion) && <ErrorApi mensaje={(productos.error ?? errorAccion)!} />}
      {productos.datos && (
        <div className="table-responsive">
          <table className="table align-middle">
            <thead><tr><th>SKU</th><th>Nombre</th><th>Categoría</th><th className="text-end">Precio</th><th className="text-end">Stock</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {lista.map((p) => (
                <tr key={p.id}>
                  <td>{p.sku}</td>
                  <td>{p.nombre}</td>
                  <td>{p.categoriaNombre}</td>
                  <td className="text-end">{precioCLP(p.precio)}</td>
                  <td className="text-end">
                    <span className={`badge ${unidades(p.id) === 0 ? 'text-bg-danger' : unidades(p.id) <= STOCK_BAJO ? 'text-bg-warning' : 'text-bg-light border'}`}>{unidades(p.id)}</span>
                  </td>
                  <td><span className={`badge ${p.activo ? 'text-bg-success' : 'text-bg-secondary'}`}>{p.activo ? 'Activo' : 'Inactivo'}</span></td>
                  <td className="text-nowrap text-end">
                    <Link className="btn btn-sm btn-outline-secondary me-2" to={`/admin/productos/${p.id}`}>Editar</Link>
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => cambiarEstado(p)}>{p.activo ? 'Desactivar' : 'Activar'}</button>
                  </td>
                </tr>
              ))}
              {lista.length === 0 && <tr><td colSpan={7} className="text-center text-secondary py-4">No hay productos en esta vista.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
