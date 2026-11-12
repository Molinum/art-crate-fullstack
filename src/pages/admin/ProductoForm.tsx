import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Cargando, ErrorApi } from '../../components/Estado'
import { useApi } from '../../hooks'
import { catalogoApi, inventarioApi } from '../../services/artcrate.service'

const VACIO = { sku: '', nombre: '', descripcion: '', precio: '', imagenUrl: 'assets/img/producto-01-acrilico-12-colores.svg', categoriaId: '', stock: '0', activo: true }

export function ProductoForm() {
  const { id } = useParams()
  const editando = !!id
  const navegar = useNavigate()
  const categorias = useApi(catalogoApi.categorias, [])
  const [f, setF] = useState(VACIO)
  const [cargando, setCargando] = useState(editando)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    Promise.all([catalogoApi.producto(Number(id)), inventarioApi.todos()])
      .then(([p, stock]) =>
        setF({
          sku: p.sku, nombre: p.nombre, descripcion: p.descripcion ?? '', precio: String(p.precio),
          imagenUrl: p.imagenUrl, categoriaId: String(p.categoriaId), activo: p.activo,
          stock: String(stock.find((s) => s.productoId === p.id)?.cantidad ?? 0),
        }),
      )
      .catch((e: Error) => setError(e.message))
      .finally(() => setCargando(false))
  }, [id])

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!f.nombre.trim() || f.nombre.length > 60) return setError('El nombre es obligatorio y puede tener hasta 60 caracteres')
    if (!f.sku.trim()) return setError('El SKU es obligatorio')
    if (!(Number(f.precio) > 0)) return setError('El precio debe ser un número mayor a 0')
    if (!Number.isInteger(Number(f.stock)) || Number(f.stock) < 0) return setError('El stock debe ser un número entero de 0 o más')
    if (!f.categoriaId) return setError('Selecciona una categoría')
    const datos = {
      sku: f.sku.trim(), nombre: f.nombre.trim(), descripcion: f.descripcion, precio: Number(f.precio),
      imagenUrl: f.imagenUrl, categoriaId: Number(f.categoriaId), activo: f.activo,
    }
    try {
      const guardado = editando ? await catalogoApi.actualizar(Number(id), datos) : await catalogoApi.crear(datos)
      await inventarioApi.fijar(guardado.id, Number(f.stock))
      navegar('/admin/productos')
    } catch (err) {
      setError((err as Error).message)
    }
  }

  if (cargando) return <Cargando />

  const set = (k: keyof typeof VACIO) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.value })

  return (
    <>
      <h1 className="mb-4">{editando ? 'Editar producto' : 'Nuevo producto'}</h1>
      <form className="card formulario-card p-4" onSubmit={guardar} noValidate style={{ maxWidth: 720 }}>
        <div className="row g-3">
          <div className="col-md-4"><label className="form-label">SKU</label><input className="form-control" value={f.sku} onChange={set('sku')} /></div>
          <div className="col-md-8"><label className="form-label">Nombre</label><input className="form-control" maxLength={60} value={f.nombre} onChange={set('nombre')} /></div>
          <div className="col-12"><label className="form-label">Descripción</label><textarea className="form-control" rows={3} value={f.descripcion} onChange={set('descripcion')} /></div>
          <div className="col-md-4"><label className="form-label">Precio (CLP)</label><input className="form-control" type="number" min={1} value={f.precio} onChange={set('precio')} /></div>
          <div className="col-md-4"><label className="form-label">Stock</label><input className="form-control" type="number" min={0} value={f.stock} onChange={set('stock')} /></div>
          <div className="col-md-4">
            <label className="form-label">Categoría</label>
            <select className="form-select" value={f.categoriaId} onChange={set('categoriaId')}>
              <option value="">Selecciona</option>
              {categorias.datos?.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div className="col-12"><label className="form-label">Imagen (ruta)</label><input className="form-control" value={f.imagenUrl} onChange={set('imagenUrl')} /></div>
          <div className="col-12 form-check ms-2">
            <input id="activo" className="form-check-input" type="checkbox" checked={f.activo} onChange={(e) => setF({ ...f, activo: e.target.checked })} />
            <label className="form-check-label" htmlFor="activo">Producto activo</label>
          </div>
        </div>
        {error && <div className="mt-3"><ErrorApi mensaje={error} /></div>}
        <button className="btn btn-primary mt-3 align-self-start" type="submit">Guardar</button>
      </form>
    </>
  )
}
