import { Link } from 'react-router-dom'
import { Cargando, ErrorApi } from '../components/Estado'
import { TarjetaProducto } from '../components/TarjetaProducto'
import { useApi } from '../hooks'
import { catalogoApi } from '../services/artcrate.service'

// Foto de un producto representativo para cada categoría, según su nombre
const IMAGENES_CATEGORIA: Record<string, string> = {
  Pintura: 'winsor-newton-winton-10.webp',
  Dibujo: 'faber-castell-pitt-pastel-24.jpg',
  'Papeles y lienzos': 'canson-montval-300.webp',
  'Pinceles y accesorios': 'royal-langnickel-espatulas-x5.jpg',
  'Kits ArtCrate': 'winsor-newton-studio-case.webp',
}

// Productos que se muestran primero en "Productos destacados" (por SKU)
const DESTACADOS = ['ART-PIN-008', 'ART-KIT-005', 'ART-DIB-012', 'ART-PAP-009']

// Íconos de línea de los beneficios (trazos SVG)
const ICONOS = {
  envio: 'M3 6h11v10H3zM14 10h4l3 3v3h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  pago: 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3M12 14v3',
  cambios: 'M9 7 4 12l5 5M4 12h10a6 6 0 0 1 6 6',
}

export function Inicio() {
  const categorias = useApi(catalogoApi.categorias, [])
  const productos = useApi(() => catalogoApi.productos(), [])
  // primero los elegidos; si alguno está desactivado, se completa con otros productos activos
  const posicion = (sku: string) => (DESTACADOS.includes(sku) ? DESTACADOS.indexOf(sku) : DESTACADOS.length)
  const destacados = (productos.datos ?? []).filter((p) => p.activo).sort((a, b) => posicion(a.sku) - posicion(b.sku)).slice(0, 4)

  return (
    <>
      <section className="hero-moderno">
        <div className="container">
          <div className="row align-items-center g-4">
            <div className="col-lg-6">
              <span className="etiqueta">Insumos de arte</span>
              <h1>Todo para crear tu próxima <span>obra</span></h1>
              <p className="lead">Pinturas, lienzos, cuadernos de dibujo y accesorios para artistas de todos los niveles.</p>
              <div className="d-flex flex-wrap gap-2">
                <Link className="btn btn-primary btn-lg" to="/catalogo">Ver el catálogo</Link>
                <Link className="btn btn-oscuro btn-lg" to="/nosotros">Conócenos</Link>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="hero-collage" aria-hidden="true">
                <img src="/assets/img/productos/winsor-newton-cotman-bolsillo.webp" alt="" />
                <img src="/assets/img/productos/winsor-newton-winton-10.webp" alt="" />
                <img src="/assets/img/productos/faber-castell-pitt-pastel-24.jpg" alt="" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container pt-5">
        <div className="row row-cols-1 row-cols-md-3 g-3">
          {[
            [ICONOS.envio, 'Envío a todo Chile', 'Despachamos en 1 a 2 días hábiles'],
            [ICONOS.pago, 'Pago seguro', 'Tarjeta o transferencia'],
            [ICONOS.cambios, 'Cambios y devoluciones', '10 días desde la recepción'],
          ].map(([icono, titulo, texto]) => (
            <div className="col" key={titulo}>
              <div className="beneficio">
                <span className="beneficio-icono" aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d={icono} />
                  </svg>
                </span>
                <div>
                  <p className="fw-bold">{titulo}</p>
                  <p className="small text-secondary">{texto}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="container py-5">
        <div className="seccion-titulo"><h2>Categorías</h2></div>
        {categorias.cargando && <Cargando />}
        {categorias.error && <ErrorApi mensaje={categorias.error} />}
        <div className="row row-cols-2 row-cols-lg-5 g-3 g-md-4">
          {categorias.datos?.map((c) => (
            <div className="col" key={c.id}>
              <article className="card h-100 tarjeta-categoria">
                <img
                  src={`/assets/img/productos/${IMAGENES_CATEGORIA[c.nombre] ?? IMAGENES_CATEGORIA.Pintura}`}
                  className="card-img-top"
                  alt={`Categoría ${c.nombre}`}
                  width="300"
                  height="375"
                />
                <div className="card-body">
                  <h3 className="card-title h5">
                    <Link className="stretched-link" to={`/catalogo?categoria=${c.id}`}>{c.nombre}</Link>
                  </h3>
                </div>
              </article>
            </div>
          ))}
        </div>
      </section>

      <section className="container pb-5">
        <div className="seccion-titulo"><h2>Productos destacados</h2><Link to="/catalogo">Ver todo →</Link></div>
        {productos.cargando && <Cargando />}
        {productos.error && <ErrorApi mensaje={productos.error} />}
        <div className="row row-cols-2 row-cols-lg-4 g-3 g-md-4">
          {destacados.map((p) => <TarjetaProducto key={p.id} producto={p} />)}
        </div>
      </section>
    </>
  )
}
