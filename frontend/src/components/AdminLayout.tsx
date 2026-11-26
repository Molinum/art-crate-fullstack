import { useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom'
import { useSesion } from '../context/SesionContext'

// Panel de administración: solo para usuarios con rol ADMIN (el backend además valida el rol del token)
export function AdminLayout() {
  const { usuario, cerrar } = useSesion()
  const navegar = useNavigate()
  const [saliendo, setSaliendo] = useState(false) // true mientras el admin cierra sesión y vuelve a la tienda
  const [menuAbierto, setMenuAbierto] = useState(false) // solo se usa en pantallas angostas
  if (!usuario) return saliendo ? null : <Navigate to="/login" replace />
  if (usuario.rol !== 'ADMIN') return <Navigate to="/" replace />

  return (
    <>
      <header>
        <nav className="navbar navbar-expand-lg admin-navbar" aria-label="Navegación de administración">
          <div className="container">
            <Link className="navbar-brand" to="/admin">
              <img src="/assets/img/logo-artcrate-claro.svg" alt="ArtCrate, administración" width="180" height="48" />
            </Link>
            <button
              className="navbar-toggler" type="button" data-bs-theme="dark" aria-label="Mostrar u ocultar el menú"
              aria-expanded={menuAbierto} aria-controls="menu-admin" onClick={() => setMenuAbierto(!menuAbierto)}
            >
              <span className="navbar-toggler-icon"></span>
            </button>
            <div id="menu-admin" className={`collapse navbar-collapse ${menuAbierto ? 'show' : ''}`} onClick={() => setMenuAbierto(false)}>
            <ul className="navbar-nav ms-auto">
              <li className="nav-item"><NavLink className="nav-link" to="/admin" end>Panel</NavLink></li>
              <li className="nav-item"><NavLink className="nav-link" to="/admin/productos">Productos</NavLink></li>
              <li className="nav-item"><NavLink className="nav-link" to="/admin/categorias">Categorías</NavLink></li>
              <li className="nav-item"><NavLink className="nav-link" to="/admin/pedidos">Pedidos</NavLink></li>
              <li className="nav-item"><NavLink className="nav-link" to="/admin/usuarios">Usuarios</NavLink></li>
              <li className="nav-item"><Link className="nav-link" to="/">Ver tienda</Link></li>
              <li className="nav-item">
                <button className="nav-link" onClick={() => { setSaliendo(true); navegar('/'); cerrar() }}>Salir ({usuario.nombre})</button>
              </li>
            </ul>
            </div>
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
