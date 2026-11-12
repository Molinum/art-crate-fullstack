import { Route, Routes } from 'react-router-dom'
import { AdminLayout } from './components/AdminLayout'
import { Layout } from './components/Layout'
import { Contacto } from './pages/Contacto'
import { Faq } from './pages/Faq'
import { Nosotros } from './pages/Nosotros'
import { Panel } from './pages/admin/Panel'
import { PedidosAdmin } from './pages/admin/PedidosAdmin'
import { ProductoForm } from './pages/admin/ProductoForm'
import { Productos } from './pages/admin/Productos'
import { Carrito } from './pages/Carrito'
import { Catalogo } from './pages/Catalogo'
import { Inicio } from './pages/Inicio'
import { Login } from './pages/Login'
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
        <Route path="/contacto" element={<Contacto />} />
        <Route path="/nosotros" element={<Nosotros />} />
        <Route path="/faq" element={<Faq />} />
      </Route>
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Panel />} />
        <Route path="productos" element={<Productos />} />
        <Route path="productos/nuevo" element={<ProductoForm />} />
        <Route path="productos/:id" element={<ProductoForm />} />
        <Route path="pedidos" element={<PedidosAdmin />} />
      </Route>
    </Routes>
  )
}

export default App
