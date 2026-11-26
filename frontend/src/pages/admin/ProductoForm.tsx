import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Cargando, ErrorApi } from '../../components/Estado'
import { useApi } from '../../hooks'
import { catalogoApi, inventarioApi, urlImagen } from '../../services/artcrate.service'

// Imágenes disponibles en public/assets/img (el backend no recibe archivos, solo la ruta)
const IMAGENES = [
  'producto-01-acrilico-12-colores', 'producto-02-oleo-6-tubos', 'producto-03-acuarela-24-pastillas',
  'producto-04-lapices-grafito-12', 'producto-05-carboncillo-difuminos', 'producto-06-marcadores-24',
  'producto-07-lienzo-40x50', 'producto-08-block-acuarela-a4', 'producto-09-cuaderno-bocetos-a5',
  'producto-10-set-pinceles-5', 'producto-11-caballete-mesa', 'producto-12-kit-iniciacion-acrilico',
  'producto-13-acrilico-metalico-x6', 'producto-14-gouache-12-colores', 'producto-15-acuarela-liquida-x8',
  'producto-16-barniz-acrilico-brillante', 'producto-17-lapices-colores-24', 'producto-18-pastel-seco-x24',
  'producto-19-portaminas-tecnico', 'producto-20-tintas-chinas-x6', 'producto-21-lienzo-30x40',
  'producto-22-lienzo-50x70', 'producto-23-block-dibujo-a3', 'producto-24-papel-kraft-rollo',
  'producto-25-paleta-de-mezcla', 'producto-26-espatulas-x5', 'producto-27-atril-de-pie',
  'producto-28-kit-acuarela-viajero', 'producto-29-kit-dibujo-profesional', 'producto-30-kit-oleo-principiante',
].map((n) => `assets/img/${n}.svg`).concat([
  'sakura-sketchbook-13x21.webp',
  'liquitex-basics-metalicos-x6.avif',
  'staedtler-mars-micro-05.webp',
  'royal-langnickel-espatulas-x5.jpg',
  'winsor-newton-winton-10.webp',
  'liquitex-basics-iridiscentes-x6.avif',
  'winsor-newton-grafito-6.webp',
  'staedtler-brush-36.webp',
  'staedtler-mars-technico-2mm.jpg',
  'winsor-newton-colores-12.webp',
  'faber-castell-pitt-pastel-24.jpg',
  'rohrer-klingner-sketchink-klara.webp',
  'canson-xl-croquis-a3.jpg',
  'canson-montval-300.webp',
  'canson-xl-mix-media-a3.webp',
  'fredrix-black-canvas-pad.png',
  'fredrix-red-label-23x30.webp',
  'fredrix-watercolor-23x30.jpg',
  'fredrix-redondo-127.jpg',
  'sakura-sketchbook-negro-12x12.webp',
  'winsor-newton-studio-case.webp',
  'winsor-newton-cotman-bolsillo.webp',
].map((n) => `assets/img/productos/${n}`))

const VACIO = { sku: '', nombre: '', descripcion: '', precio: '', marca: '', formato: '', contenido: '', imagenUrl: 'assets/img/productos/winsor-newton-winton-10.webp', categoriaId: '', stock: '0', activo: true }

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
          marca: p.marca ?? '', formato: p.formato ?? '', contenido: p.contenido ?? '',
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
      marca: f.marca.trim(), formato: f.formato.trim(), contenido: f.contenido.trim(),
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
          <div className="col-md-4"><label className="form-label">Marca</label><input className="form-control" value={f.marca} onChange={set('marca')} /></div>
          <div className="col-md-4"><label className="form-label">Formato</label><input className="form-control" placeholder="Ej: Tubos de 22 ml" value={f.formato} onChange={set('formato')} /></div>
          <div className="col-md-4"><label className="form-label">Contenido</label><input className="form-control" placeholder="Ej: 12 colores" value={f.contenido} onChange={set('contenido')} /></div>
          <div className="col-md-4"><label className="form-label">Precio (CLP)</label><input className="form-control" type="number" min={1} value={f.precio} onChange={set('precio')} /></div>
          <div className="col-md-4"><label className="form-label">Stock</label><input className="form-control" type="number" min={0} value={f.stock} onChange={set('stock')} /></div>
          <div className="col-md-4">
            <label className="form-label">Categoría</label>
            <select className="form-select" value={f.categoriaId} onChange={set('categoriaId')}>
              <option value="">Selecciona</option>
              {categorias.datos?.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div className="col-md-8">
            <label className="form-label" htmlFor="imagen">Imagen</label>
            <select id="imagen" className="form-select" value={f.imagenUrl} onChange={set('imagenUrl')}>
              {!IMAGENES.includes(f.imagenUrl) && <option value={f.imagenUrl}>{f.imagenUrl}</option>}
              {IMAGENES.map((i) => <option key={i} value={i}>{i.replace(/^.*\//, '').replace(/\.\w+$/, '')}</option>)}
            </select>
          </div>
          <div className="col-md-4">
            <img src={urlImagen(f.imagenUrl)} alt="Vista previa de la imagen del producto" className="img-fluid rounded border" style={{ maxHeight: 120 }} />
          </div>
          <div className="col-12 form-check ms-2">
            <input id="activo" className="form-check-input" type="checkbox" checked={f.activo} onChange={(e) => setF({ ...f, activo: e.target.checked })} />
            <label className="form-check-label" htmlFor="activo">Producto activo (visible en la tienda)</label>
          </div>
        </div>
        {error && <div className="mt-3"><ErrorApi mensaje={error} /></div>}
        <div className="d-flex gap-2 mt-3">
          <button className="btn btn-primary" type="submit">Guardar</button>
          <button className="btn btn-outline-secondary" type="button" onClick={() => navegar('/admin/productos')}>Cancelar</button>
        </div>
      </form>
    </>
  )
}
