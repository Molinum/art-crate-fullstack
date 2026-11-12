import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Cargando, ErrorApi } from '../../components/Estado'
import { useApi } from '../../hooks'
import { catalogoApi, inventarioApi, precioCLP } from '../../services/artcrate.service'

export function Productos() {
  const [version, setVersion] = useState(0)
  const [errorAccion, setErrorAccion] = useState<string | null>(null)
  const productos = useApi(() => catalogoApi.productos(), [version])
  const stock = useApi(inventarioApi.todos, [version])

  async function eliminar(id: number, nombre: string) {
    if (!window.confirm(`¿Eliminar "${nombre}"? Esta acción no se puede deshacer.`)) return
    setErrorAccion(null)
    try {
      await catalogoApi.eliminar(id)
      setVersion((v) => v + 1)
    } catch (e) {
      setErrorAccion((e as Error).message)
    }
  }

  const cantidad = (id: number) => stock.datos?.find((s) => s.productoId === id)?.cantidad ?? 0

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="mb-0">Productos</h1>
        <Link className="btn btn-primary" to="/admin/productos/nuevo">Nuevo producto</Link>
      </div>
      {productos.cargando && <Cargando />}
      {(productos.error ?? errorAccion) && <ErrorApi mensaje={(productos.error ?? errorAccion)!} />}
      {productos.datos && (
        <div className="table-responsive">
          <table className="table align-middle">
            <thead><tr><th>SKU</th><th>Nombre</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {productos.datos.map((p) => (
                <tr key={p.id}>
                  <td>{p.sku}</td>
                  <td>{p.nombre}</td>
                  <td>{p.categoriaNombre}</td>
                  <td>{precioCLP(p.precio)}</td>
                  <td>{cantidad(p.id)}</td>
                  <td><span className={`badge ${p.activo ? 'text-bg-success' : 'text-bg-secondary'}`}>{p.activo ? 'Activo' : 'Inactivo'}</span></td>
                  <td className="text-nowrap">
                    <Link className="btn btn-sm btn-outline-secondary me-2" to={`/admin/productos/${p.id}`}>Editar</Link>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => eliminar(p.id, p.nombre)}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
