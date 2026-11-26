// Utilidades de prueba (no es código de la aplicación): exporta datos y funciones junto al componente auxiliar `Ruta`
/* eslint-disable react-refresh/only-export-components */
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import App from '../App'
import { CarritoProvider } from '../context/CarritoContext'
import { SesionProvider } from '../context/SesionContext'
import type { Carrito, Pedido, Producto, Usuario } from '../types'

// Datos de ejemplo compartidos por las pruebas de las pantallas
export const cliente: Usuario = {
  id: 2, nombre: 'Camila', apellido: 'Rojas', correo: 'camila@artcrate.cl', telefono: null, region: null, rol: 'CLIENTE', activo: true,
}
export const encargado: Usuario = { ...cliente, id: 3, nombre: 'Eduardo', apellido: 'Soto', correo: 'eduardo@artcrate.cl', rol: 'ENCARGADO' }
export const admin: Usuario = { ...cliente, id: 1, nombre: 'Ana', apellido: 'Admin', correo: 'admin@artcrate.cl', rol: 'ADMIN' }

export const producto = (id: number, extra: Partial<Producto> = {}): Producto => ({
  id, sku: `ART-${id}`, nombre: `Producto ${id}`, descripcion: `Descripción ${id}`, precio: 1000 * id, imagenUrl: 'assets/img/x.svg',
  marca: 'Marca', formato: null, contenido: null, categoriaId: 1, categoriaNombre: 'Acuarela', activo: true, ...extra,
})

export const carrito = (items: { productoId: number; nombre: string; precioUnitario: number; cantidad: number }[]): Carrito => {
  const conSubtotal = items.map((i) => ({ ...i, imagenUrl: 'assets/img/x.svg', subtotal: i.precioUnitario * i.cantidad }))
  return { id: 1, usuarioId: cliente.id, items: conSubtotal, total: conSubtotal.reduce((t, i) => t + i.subtotal, 0) }
}

export const pedido = (extra: Partial<Pedido> = {}): Pedido => ({
  id: 40, usuarioId: cliente.id, fecha: '2026-05-10T15:30:00', estado: 'PENDIENTE_PAGO', total: 25980,
  direccionDespacho: 'Av. Siempre Viva 742', comuna: 'Providencia', region: 'Metropolitana de Santiago',
  items: [{ productoId: 1, nombre: 'Producto 1', precioUnitario: 12990, cantidad: 2, subtotal: 25980 }], ...extra,
})

// Muestra la ruta actual para comprobar a dónde navegó la app
function Ruta() {
  const { pathname, search } = useLocation()
  return <output data-testid="ruta">{pathname + search}</output>
}

// Dibuja la aplicación completa (rutas reales, sesión y carrito reales) en la ruta pedida.
// Solo la capa HTTP se reemplaza en cada prueba, así se verifica cómo se conectan las pantallas entre sí.
export function montarApp(ruta: string, usuario?: Usuario, token = 'token-de-prueba') {
  if (usuario) {
    localStorage.setItem('artcrate.usuario', JSON.stringify(usuario))
    localStorage.setItem('artcrate.token', token)
  }
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <SesionProvider>
        <CarritoProvider>
          <App />
          <Ruta />
        </CarritoProvider>
      </SesionProvider>
    </MemoryRouter>,
  )
  return userEvent.setup()
}
