import { Route, Routes } from 'react-router-dom'
import { AdminLayout } from './components/AdminLayout'
import { Layout } from './components/Layout'
import { Contacto } from './pages/Contacto'
import { Faq } from './pages/Faq'
import { Nosotros } from './pages/Nosotros'
import { NoEncontrada } from './pages/NoEncontrada'
import { Categorias } from './pages/admin/Categorias'
import { Panel } from './pages/admin/Panel'
import { PedidoAdmin } from './pages/admin/PedidoAdmin'
import { PedidosAdmin } from './pages/admin/PedidosAdmin'
import { ProductoForm } from './pages/admin/ProductoForm'
import { Productos } from './pages/admin/Productos'
import { Usuarios } from './pages/admin/Usuarios'
import { Carrito } from './pages/Carrito'
import { Catalogo } from './pages/Catalogo'
import { Inicio } from './pages/Inicio'
import { Login } from './pages/Login'
import { PedidoDetalle } from './pages/PedidoDetalle'
import { Pedidos } from './pages/Pedidos'
import { Producto } from './pages/Producto'
import { Registro } from './pages/Registro'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Inicio />} />
        <Route path="/catalogo" element={<Catalogo />} />
        <Route path="/producto/:id" element={<Producto />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/carrito" element={<Carrito />} />
        <Route path="/pedidos" element={<Pedidos />} />
        <Route path="/pedidos/:id" element={<PedidoDetalle />} />
        <Route path="/contacto" element={<Contacto />} />
        <Route path="/nosotros" element={<Nosotros />} />
        <Route path="/faq" element={<Faq />} />
        <Route path="*" element={<NoEncontrada />} />
      </Route>
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Panel />} />
        <Route path="productos" element={<Productos />} />
        <Route path="productos/nuevo" element={<ProductoForm />} />
        <Route path="productos/:id" element={<ProductoForm />} />
        <Route path="categorias" element={<Categorias />} />
        <Route path="usuarios" element={<Usuarios />} />
        <Route path="pedidos" element={<PedidosAdmin />} />
        <Route path="pedidos/:id" element={<PedidoAdmin />} />
      </Route>
    </Routes>
  )
}

export default App
