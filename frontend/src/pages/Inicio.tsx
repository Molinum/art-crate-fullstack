import { Link } from 'react-router-dom'
import { Cargando, ErrorApi } from '../components/Estado'
import { TarjetaProducto } from '../components/TarjetaProducto'
import { useApi } from '../hooks'
import { catalogoApi } from '../services/artcrate.service'

// Imagen de cada categoría según su posición (ids 1..5 del backend)
const IMAGENES_CATEGORIA: Record<string, string> = {
  Pintura: 'categoria-pintura',
  Dibujo: 'categoria-dibujo',
  'Papeles y lienzos': 'categoria-papeles',
  'Pinceles y accesorios': 'categoria-pinceles',
  'Kits ArtCrate': 'categoria-kits',
}

export function Inicio() {
  const categorias = useApi(catalogoApi.categorias, [])
  const productos = useApi(() => catalogoApi.productos(), [])

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
                <img src="/assets/img/producto-03-acuarela-24-pastillas.svg" alt="" />
                <img src="/assets/img/producto-12-kit-iniciacion-acrilico.svg" alt="" />
                <img src="/assets/img/producto-07-lienzo-40x50.svg" alt="" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container pt-5">
        <div className="row row-cols-1 row-cols-md-3 g-3">
          {[
            ['🚚', 'Envío a todo Chile', 'Despachamos en 1 a 2 días hábiles'],
            ['🔒', 'Pago seguro', 'Tarjeta o transferencia'],
            ['↩', 'Cambios y devoluciones', '10 días desde la recepción'],
          ].map(([icono, titulo, texto]) => (
            <div className="col" key={titulo}>
              <div className="beneficio">
                <span className="beneficio-icono" aria-hidden="true">{icono}</span>
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
        <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-5 g-4">
          {categorias.datos?.map((c) => (
            <div className="col" key={c.id}>
              <article className="card h-100 tarjeta-categoria">
                <img
                  src={`/assets/img/${IMAGENES_CATEGORIA[c.nombre] ?? 'categoria-kits'}.svg`}
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
        <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-4 g-4">
          {productos.datos?.slice(0, 4).map((p) => <TarjetaProducto key={p.id} producto={p} />)}
        </div>
      </section>
    </>
  )
}
