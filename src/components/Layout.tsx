import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useSesion } from '../context/SesionContext'

export function Layout() {
  const { usuario, cerrar } = useSesion()
  const navegar = useNavigate()

  return (
    <>
      <header>
        <nav className="navbar navbar-expand-lg" aria-label="Navegación principal">
          <div className="container">
            <Link className="navbar-brand" to="/">
              <img src="/assets/img/logo-artcrate.svg" alt="ArtCrate, tienda de insumos de arte" width="180" height="48" />
            </Link>
            <button
              className="navbar-toggler"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#menu-principal"
              aria-label="Mostrar u ocultar el menú"
            >
              <span className="navbar-toggler-icon"></span>
            </button>
            <div className="collapse navbar-collapse" id="menu-principal">
              <ul className="navbar-nav ms-auto">
                <li className="nav-item"><NavLink className="nav-link" to="/" end>Inicio</NavLink></li>
                <li className="nav-item"><NavLink className="nav-link" to="/catalogo">Catálogo</NavLink></li>
                <li className="nav-item"><NavLink className="nav-link" to="/contacto">Contacto</NavLink></li>
                <li className="nav-item"><NavLink className="nav-link" to="/carrito">Carrito</NavLink></li>
                {usuario ? (
                  <>
                    <li className="nav-item"><NavLink className="nav-link" to="/pedidos">Mis pedidos</NavLink></li>
                    {usuario.rol === 'ADMIN' && (
                      <li className="nav-item"><NavLink className="nav-link" to="/admin">Administración</NavLink></li>
                    )}
                    <li className="nav-item">
                      <button
                        className="nav-link"
                        onClick={() => { cerrar(); navegar('/') }}
                      >
                        Salir ({usuario.nombre})
                      </button>
                    </li>
                  </>
                ) : (
                  <>
                    <li className="nav-item"><NavLink className="nav-link" to="/login">Ingresar</NavLink></li>
                    <li className="nav-item"><NavLink className="nav-link" to="/registro">Registrarme</NavLink></li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </nav>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="pie">
        <div className="container py-4">
          <div className="row g-4">
            <section className="col-md-4">
              <h2 className="h5">Contacto</h2>
              <address className="mb-0">
                Av. Providencia 1234, Providencia, Santiago<br />
                <a href="mailto:contacto@artcrate.cl">contacto@artcrate.cl</a><br />
                <a href="tel:+56912345678">+56 9 1234 5678</a>
              </address>
            </section>
            <nav className="col-md-4" aria-label="Enlaces del pie de página">
              <h2 className="h5">Enlaces útiles</h2>
              <ul className="list-unstyled">
                <li><Link to="/">Inicio</Link></li>
                <li><Link to="/catalogo">Catálogo</Link></li>
                <li><Link to="/nosotros">Nosotros</Link></li>
                <li><Link to="/contacto">Contacto</Link></li>
                <li><Link to="/faq">Preguntas frecuentes</Link></li>
              </ul>
            </nav>
            <section className="col-md-4">
              <h2 className="h5">Síguenos</h2>
              <ul className="list-unstyled">
                <li><a href="https://www.instagram.com/" target="_blank" rel="noopener">Instagram</a></li>
                <li><a href="https://www.facebook.com/" target="_blank" rel="noopener">Facebook</a></li>
              </ul>
            </section>
          </div>
          <p className="text-center small mt-4 mb-0">&copy; 2026 ArtCrate. Todos los derechos reservados.</p>
        </div>
      </footer>
    </>
  )
}
