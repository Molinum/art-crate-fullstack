import { useState } from 'react'
import { Cargando, ErrorApi } from '../../components/Estado'
import { useApi } from '../../hooks'
import { catalogoApi } from '../../services/artcrate.service'
import type { Categoria } from '../../types'

export function Categorias() {
  const [version, setVersion] = useState(0)
  const categorias = useApi(catalogoApi.categorias, [version])
  const productos = useApi(() => catalogoApi.productos(), [version])
  const [editando, setEditando] = useState<number | 'nueva' | null>(null)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [error, setError] = useState<string | null>(null)

  const cuantos = (id: number) => (productos.datos ?? []).filter((p) => p.categoriaId === id).length

  function abrir(c?: Categoria) {
    setError(null)
    setEditando(c ? c.id : 'nueva')
    setNombre(c?.nombre ?? '')
    setDescripcion(c?.descripcion ?? '')
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) return setError('El nombre de la categoría es obligatorio')
    setError(null)
    try {
      if (editando === 'nueva') await catalogoApi.crearCategoria(nombre.trim(), descripcion.trim())
      else await catalogoApi.actualizarCategoria(Number(editando), nombre.trim(), descripcion.trim())
      setEditando(null)
      setVersion((v) => v + 1)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  async function eliminar(c: Categoria) {
    if (!window.confirm(`¿Eliminar la categoría "${c.nombre}"?`)) return
    setError(null)
    try {
      await catalogoApi.eliminarCategoria(c.id)
      setVersion((v) => v + 1)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="mb-0">Categorías</h1>
        <button className="btn btn-primary" onClick={() => abrir()}>Nueva categoría</button>
      </div>
      <p className="text-secondary small">Solo se pueden eliminar categorías que no tengan productos asociados.</p>

      {editando !== null && (
        <form className="card formulario-card p-4 mb-4" style={{ maxWidth: 560 }} onSubmit={guardar} noValidate>
          <h2 className="h5">{editando === 'nueva' ? 'Nueva categoría' : 'Editar categoría'}</h2>
          <label className="form-label" htmlFor="cat-nombre">Nombre</label>
          <input id="cat-nombre" className="form-control mb-3" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <label className="form-label" htmlFor="cat-desc">Descripción</label>
          <textarea id="cat-desc" className="form-control mb-3" rows={2} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          <div className="d-flex gap-2">
            <button className="btn btn-primary" type="submit">Guardar</button>
            <button className="btn btn-outline-secondary" type="button" onClick={() => setEditando(null)}>Cancelar</button>
          </div>
        </form>
      )}

      {categorias.cargando && !categorias.datos && <Cargando />}
      {(categorias.error ?? error) && <ErrorApi mensaje={(categorias.error ?? error)!} />}
      {categorias.datos && (
        <div className="table-responsive">
          <table className="table align-middle">
            <thead><tr><th>Nombre</th><th>Descripción</th><th className="text-end">Productos</th><th></th></tr></thead>
            <tbody>
              {categorias.datos.map((c) => (
                <tr key={c.id}>
                  <td>{c.nombre}</td>
                  <td className="text-secondary">{c.descripcion || '—'}</td>
                  <td className="text-end">{cuantos(c.id)}</td>
                  <td className="text-nowrap text-end">
                    <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => abrir(c)}>Editar</button>
                    <button className="btn btn-sm btn-outline-danger" disabled={cuantos(c.id) > 0} title={cuantos(c.id) > 0 ? 'Tiene productos asociados' : undefined} onClick={() => eliminar(c)}>Eliminar</button>
                  </td>
                </tr>
              ))}
              {categorias.datos.length === 0 && <tr><td colSpan={4} className="text-center text-secondary py-4">Aún no hay categorías.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
