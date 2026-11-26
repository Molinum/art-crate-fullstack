import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Campo } from '../../components/Campo'
import { Cargando, ErrorApi } from '../../components/Estado'
import { useApi } from '../../hooks'
import { catalogoApi, inventarioApi, urlImagen } from '../../services/artcrate.service'

// Fotos disponibles en public/assets/img/productos (el backend no recibe archivos, solo la ruta)
const IMAGENES = [
  'sakura-sketchbook-13x21.webp', 'liquitex-basics-metalicos-x6.avif', 'staedtler-mars-micro-05.webp',
  'royal-langnickel-espatulas-x5.jpg', 'winsor-newton-winton-10.webp', 'liquitex-basics-iridiscentes-x6.avif',
  'winsor-newton-grafito-6.webp', 'staedtler-brush-36.webp', 'staedtler-mars-technico-2mm.jpg',
  'winsor-newton-colores-12.webp', 'faber-castell-pitt-pastel-24.jpg', 'rohrer-klingner-sketchink-klara.webp',
  'canson-xl-croquis-a3.jpg', 'canson-montval-300.webp', 'canson-xl-mix-media-a3.webp', 'fredrix-black-canvas-pad.png',
  'fredrix-red-label-23x30.webp', 'fredrix-watercolor-23x30.jpg', 'fredrix-redondo-127.jpg',
  'sakura-sketchbook-negro-12x12.webp', 'winsor-newton-studio-case.webp', 'winsor-newton-cotman-bolsillo.webp',
].map((n) => `assets/img/productos/${n}`)

const nombreImagen = (ruta: string) => ruta.replace(/^.*\//, '').replace(/\.\w+$/, '').replace(/-/g, ' ')

const VACIO = { sku: '', nombre: '', descripcion: '', precio: '', marca: '', formato: '', contenido: '', imagenUrl: '', categoriaId: '', stock: '0', activo: true }
type Valores = typeof VACIO
type CampoTexto = Exclude<keyof Valores, 'activo'>
type Errores = Partial<Record<CampoTexto, string>>

// Orden en pantalla: sirve para llevar el foco al primer campo con error
const ORDEN: CampoTexto[] = ['sku', 'nombre', 'precio', 'stock', 'categoriaId', 'imagenUrl']

function validar(v: Valores): Errores {
  const e: Errores = {}
  if (!v.sku.trim()) e.sku = 'El SKU es obligatorio'
  if (!v.nombre.trim() || v.nombre.length > 60) e.nombre = 'El nombre es obligatorio y puede tener hasta 60 caracteres'
  if (!(Number(v.precio) > 0) || !Number.isInteger(Number(v.precio))) e.precio = 'Ingresa un precio en pesos, mayor a 0'
  if (v.stock === '' || !Number.isInteger(Number(v.stock)) || Number(v.stock) < 0) e.stock = 'Debe ser un número entero de 0 o más'
  if (!v.categoriaId) e.categoriaId = 'Selecciona una categoría'
  if (!v.imagenUrl) e.imagenUrl = 'Elige una imagen'
  return e
}

interface EstadoNavegacion {
  stock?: string // stock que quedó sin guardar
  error?: string
}

export function ProductoForm() {
  const { id } = useParams()
  const editando = !!id
  const navegar = useNavigate()
  const pendiente = useLocation().state as EstadoNavegacion | null
  const stockPendiente = pendiente?.stock
  const categorias = useApi(catalogoApi.categorias, [])
  const [f, setF] = useState(VACIO)
  const [cargando, setCargando] = useState(editando)
  const [intentado, setIntentado] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(pendiente?.error ?? null)

  useEffect(() => {
    if (!id) return
    Promise.all([catalogoApi.producto(Number(id)), inventarioApi.todos()])
      .then(([p, stock]) =>
        setF({
          sku: p.sku, nombre: p.nombre, descripcion: p.descripcion ?? '', precio: String(p.precio),
          marca: p.marca ?? '', formato: p.formato ?? '', contenido: p.contenido ?? '',
          imagenUrl: p.imagenUrl, categoriaId: String(p.categoriaId), activo: p.activo,
          stock: stockPendiente ?? String(stock.find((s) => s.productoId === p.id)?.cantidad ?? 0),
        }),
      )
      .catch((e: Error) => setError(e.message))
      .finally(() => setCargando(false))
  }, [id, stockPendiente])

  const errores = validar(f)
  const falla = (c: CampoTexto) => (intentado ? errores[c] : undefined)
  const clase = (c: CampoTexto, base = 'form-control') => `${base} ${falla(c) ? 'is-invalid' : ''}`
  const set = (k: CampoTexto) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.value })

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setIntentado(true)
    setError(null)
    const primero = ORDEN.find((c) => errores[c])
    if (primero) {
      document.getElementById(`prod-${primero}`)?.focus()
      return
    }
    const datos = {
      sku: f.sku.trim(), nombre: f.nombre.trim(), descripcion: f.descripcion, precio: Number(f.precio),
      marca: f.marca.trim(), formato: f.formato.trim(), contenido: f.contenido.trim(),
      imagenUrl: f.imagenUrl, categoriaId: Number(f.categoriaId), activo: f.activo,
    }
    setGuardando(true)
    let guardadoId: number | null = null
    try {
      const guardado = editando ? await catalogoApi.actualizar(Number(id), datos) : await catalogoApi.crear(datos)
      guardadoId = guardado.id
      await inventarioApi.fijar(guardado.id, Number(f.stock))
      navegar('/admin/productos', { state: { aviso: `"${datos.nombre}" se ${editando ? 'actualizó' : 'creó'} correctamente.` } })
    } catch (err) {
      const mensaje = (err as Error).message
      if (guardadoId === null) {
        setError(mensaje)
      } else {
        // El producto ya quedó guardado y solo falló el stock: se sigue editando ese producto,
        // para que reintentar no intente crear otro con el mismo SKU
        const aviso = `El producto se guardó, pero no el stock: ${mensaje} Vuelve a pulsar "Guardar" para reintentarlo.`
        setError(aviso)
        if (!editando) navegar(`/admin/productos/${guardadoId}`, { replace: true, state: { stock: f.stock, error: aviso } })
      }
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) return <Cargando />

  const imagenes = f.imagenUrl && !IMAGENES.includes(f.imagenUrl) ? [f.imagenUrl, ...IMAGENES] : IMAGENES
  const texto = (c: CampoTexto, etiqueta: string, columnas: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <Campo id={`prod-${c}`} etiqueta={etiqueta} error={falla(c)} className={columnas}>
      <input id={`prod-${c}`} className={clase(c)} value={f[c]} onChange={set(c)} aria-invalid={!!falla(c)} {...extra} />
    </Campo>
  )

  return (
    <>
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><Link to="/admin/productos">Productos</Link></li>
          <li className="breadcrumb-item active">{editando ? f.nombre || 'Editar' : 'Nuevo'}</li>
        </ol>
      </nav>
      <h1 className="mb-4">{editando ? 'Editar producto' : 'Nuevo producto'}</h1>

      {error && <ErrorApi mensaje={error} />}
      {intentado && ORDEN.some((c) => errores[c]) && <ErrorApi mensaje="Revisa los campos marcados." />}

      <form onSubmit={guardar} noValidate>
        <div className="row g-4">
          <div className="col-lg-7">
            <div className="card formulario-card p-4">
              <div className="row g-3">
                {texto('sku', 'SKU', 'col-md-4')}
                {texto('nombre', 'Nombre', 'col-md-8', { maxLength: 60 })}
                <Campo id="prod-descripcion" etiqueta="Descripción" className="col-12">
                  <textarea id="prod-descripcion" className="form-control" rows={3} value={f.descripcion} onChange={set('descripcion')} />
                </Campo>
                {texto('marca', 'Marca', 'col-md-4')}
                {texto('formato', 'Formato', 'col-md-4', { placeholder: 'Ej: Tubos de 22 ml' })}
                {texto('contenido', 'Contenido', 'col-md-4', { placeholder: 'Ej: 12 colores' })}
                {texto('precio', 'Precio (CLP)', 'col-md-4', { type: 'number', min: 1 })}
                {texto('stock', 'Stock', 'col-md-4', { type: 'number', min: 0 })}
                <Campo id="prod-categoriaId" etiqueta="Categoría" error={falla('categoriaId')} className="col-md-4">
                  <select id="prod-categoriaId" className={clase('categoriaId', 'form-select')} value={f.categoriaId} onChange={set('categoriaId')}>
                    <option value="">Selecciona</option>
                    {categorias.datos?.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </Campo>
              </div>
            </div>
          </div>

          <div className="col-lg-5">
            <fieldset className="card formulario-card p-4 mb-3">
              <legend className="h6">Imagen</legend>
              <div className="vista-previa mb-3">
                {f.imagenUrl ? <img src={urlImagen(f.imagenUrl)} alt="Vista previa de la imagen del producto" /> : <span className="text-secondary small">Sin imagen elegida</span>}
              </div>
              <div className="selector-imagenes" id="prod-imagenUrl" tabIndex={-1}>
                {imagenes.map((i) => (
                  <button key={i} type="button" title={nombreImagen(i)} aria-label={`Usar la imagen ${nombreImagen(i)}`}
                    aria-pressed={f.imagenUrl === i} onClick={() => setF({ ...f, imagenUrl: i })}>
                    <img src={urlImagen(i)} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
              {falla('imagenUrl') && <div className="invalid-feedback d-block" role="alert">{falla('imagenUrl')}</div>}
            </fieldset>

            <div className="card formulario-card p-4">
              <div className="form-check form-switch mb-3">
                <input id="activo" className="form-check-input" type="checkbox" checked={f.activo} onChange={(e) => setF({ ...f, activo: e.target.checked })} />
                <label className="form-check-label" htmlFor="activo">Producto activo (visible en la tienda)</label>
              </div>
              <div className="d-flex gap-2">
                <button className="btn btn-primary" type="submit" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</button>
                <Link className="btn btn-outline-secondary" to="/admin/productos">Cancelar</Link>
              </div>
            </div>
          </div>
        </div>
      </form>
    </>
  )
}
