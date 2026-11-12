import { Link, NavLink, Navigate, Outlet } from 'react-router-dom'
import { useSesion } from '../context/SesionContext'

// Panel de administración: solo para usuarios con rol ADMIN (el backend aún no valida roles)
export function AdminLayout() {
  const { usuario } = useSesion()
  if (!usuario) return <Navigate to="/login" replace />
  if (usuario.rol !== 'ADMIN') return <Navigate to="/" replace />

  return (
    <>
      <header>
        <nav className="navbar navbar-expand admin-navbar" aria-label="Navegación de administración">
          <div className="container">
            <Link className="navbar-brand" to="/admin">
              <img src="/assets/img/logo-artcrate-claro.svg" alt="ArtCrate, administración" width="180" height="48" />
            </Link>
            <ul className="navbar-nav ms-auto">
              <li className="nav-item"><NavLink className="nav-link" to="/admin" end>Panel</NavLink></li>
              <li className="nav-item"><NavLink className="nav-link" to="/admin/productos">Productos</NavLink></li>
              <li className="nav-item"><NavLink className="nav-link" to="/admin/pedidos">Pedidos</NavLink></li>
              <li className="nav-item"><Link className="nav-link" to="/">Ver tienda</Link></li>
            </ul>
          </div>
        </nav>
      </header>
      <main className="container py-5">
        <Outlet />
      </main>
      <footer className="admin-footer text-center small py-3">&copy; 2026 ArtCrate · Administración</footer>
    </>
  )
}
