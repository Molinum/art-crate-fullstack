import { useState } from 'react'
import { Aviso } from '../../components/admin/Aviso'
import { useConfirmar } from '../../components/admin/useConfirmar'
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
  const [errorNombre, setErrorNombre] = useState<string | undefined>()
  const [aviso, setAviso] = useState<string | null>(null)
  const [confirmar, dialogo] = useConfirmar()

  const cuantos = (id: number) => (productos.datos ?? []).filter((p) => p.categoriaId === id).length
  const activos = (id: number) => (productos.datos ?? []).filter((p) => p.categoriaId === id && p.activo).length

  function abrir(c?: Categoria) {
    setError(null)
    setErrorNombre(undefined)
    setAviso(null)
    setEditando(c ? c.id : 'nueva')
    setNombre(c?.nombre ?? '')
    setDescripcion(c?.descripcion ?? '')
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) return setErrorNombre('El nombre de la categoría es obligatorio')
    setErrorNombre(undefined)
    setError(null)
    try {
      if (editando === 'nueva') await catalogoApi.crearCategoria(nombre.trim(), descripcion.trim())
      else await catalogoApi.actualizarCategoria(Number(editando), nombre.trim(), descripcion.trim())
      setAviso(`La categoría "${nombre.trim()}" se ${editando === 'nueva' ? 'creó' : 'actualizó'}.`)
      setEditando(null)
      setVersion((v) => v + 1)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  async function eliminar(c: Categoria) {
    if (!(await confirmar({ titulo: 'Eliminar categoría', mensaje: `Se eliminará "${c.nombre}". Esta acción no se puede deshacer.`, boton: 'Eliminar', peligro: true }))) return
    setError(null)
    setAviso(null)
    try {
      await catalogoApi.eliminarCategoria(c.id)
      setAviso(`La categoría "${c.nombre}" se eliminó.`)
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

      <Aviso texto={aviso} onCerrar={() => setAviso(null)} />

      {editando !== null && (
        <form className="card formulario-card p-4 mb-4" style={{ maxWidth: 560 }} onSubmit={guardar} noValidate>
          <h2 className="h5">{editando === 'nueva' ? 'Nueva categoría' : 'Editar categoría'}</h2>
          <label className="form-label" htmlFor="cat-nombre">Nombre</label>
          <input id="cat-nombre" className={`form-control ${errorNombre ? 'is-invalid' : 'mb-3'}`} aria-invalid={!!errorNombre} value={nombre} onChange={(e) => setNombre(e.target.value)} />
          {errorNombre && <div className="invalid-feedback d-block mb-3" role="alert">{errorNombre}</div>}
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
          <table className="table align-middle tabla-admin">
            <thead><tr><th>Nombre</th><th>Descripción</th><th className="text-end">Productos activos</th><th></th></tr></thead>
            <tbody>
              {categorias.datos.map((c) => (
                <tr key={c.id}>
                  <td className="celda-principal fw-semibold">{c.nombre}</td>
                  <td data-label="Descripción" className="text-secondary">{c.descripcion || '—'}</td>
                  <td data-label="Productos activos" className="text-end">
                    {activos(c.id)} <span className="text-secondary small">de {cuantos(c.id)}</span>
                  </td>
                  <td className="celda-acciones text-nowrap text-end">
                    <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => abrir(c)}>Editar</button>
                    {cuantos(c.id) > 0
                      ? <span className="small text-secondary d-inline-block nota-accion">Con productos</span>
                      : <button className="btn btn-sm btn-outline-danger nota-accion" onClick={() => eliminar(c)}>Eliminar</button>}
                  </td>
                </tr>
              ))}
              {categorias.datos.length === 0 && <tr><td colSpan={4} className="text-center text-secondary py-4">Aún no hay categorías.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {dialogo}
    </>
  )
}
