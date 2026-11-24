import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CarritoProvider, useCarrito } from '../context/CarritoContext'
import { SesionProvider } from '../context/SesionContext'
import type { Carrito, Producto, Usuario } from '../types'
import { TarjetaProducto } from './TarjetaProducto'

const { ver, agregar } = vi.hoisted(() => ({ ver: vi.fn(), agregar: vi.fn() }))
vi.mock('../services/artcrate.service', async (original) => ({
  ...(await original<typeof import('../services/artcrate.service')>()),
  carritoApi: { ver, agregar },
}))

const producto = {
  id: 7, sku: 'ART-7', nombre: 'Acuarela 24 pastillas', precio: 24990, imagenUrl: 'assets/img/x.svg',
  categoriaNombre: 'Acuarela', activo: true,
} as Producto
const cliente: Usuario = { id: 2, nombre: 'Cliente', apellido: 'Prueba', correo: 'c@artcrate.cl', telefono: null, region: null, rol: 'CLIENTE', activo: true }
const carrito = (unidades: number) => ({ id: 1, usuarioId: 2, items: [{ cantidad: unidades }], total: 0 }) as unknown as Carrito

// El contador del navbar: sirve para comprobar que el botón actualiza el carrito global
function Contador() {
  return <span data-testid="contador">{useCarrito().cantidad}</span>
}

function montar(props: { agregable?: boolean; stock?: number } = { agregable: true }, conSesion = true) {
  if (conSesion) localStorage.setItem('artcrate.usuario', JSON.stringify(cliente))
  render(
    <MemoryRouter initialEntries={['/catalogo']}>
      <SesionProvider>
        <CarritoProvider>
          <Contador />
          <Routes>
            <Route path="/catalogo" element={<div className="row"><TarjetaProducto producto={producto} {...props} /></div>} />
            <Route path="/login" element={<p>Pantalla de login</p>} />
            <Route path="/producto/:id" element={<p>Detalle del producto</p>} />
          </Routes>
        </CarritoProvider>
      </SesionProvider>
    </MemoryRouter>,
  )
  return userEvent.setup()
}

const boton = () => screen.getByRole('button', { name: /Agregar Acuarela 24 pastillas al carrito/ })

describe('TarjetaProducto con botón de agregar', () => {
  beforeEach(() => {
    ver.mockReset().mockResolvedValue(carrito(0))
    agregar.mockReset()
  })

  it('sin la opción "agregable" no muestra el botón (por ejemplo en el inicio)', () => {
    montar({})
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: producto.nombre })).toBeInTheDocument()
  })

  it('agrega UNA unidad del producto al carrito del usuario', async () => {
    agregar.mockResolvedValue(carrito(1))
    const usuario = montar()

    await usuario.click(boton())

    expect(agregar).toHaveBeenCalledWith(2, 7, 1)
  })

  it('muestra "✓ Agregado" y actualiza el contador del carrito', async () => {
    agregar.mockResolvedValue(carrito(3))
    const usuario = montar()

    await usuario.click(boton())

    expect(await screen.findByRole('button', { name: /Agregar Acuarela/ })).toHaveTextContent('✓ Agregado')
    expect(screen.getByTestId('contador')).toHaveTextContent('3')
  })

  it('mientras agrega, el botón se desactiva para evitar doble clic', async () => {
    agregar.mockReturnValue(new Promise(() => {})) // nunca responde
    const usuario = montar()

    await usuario.click(boton())

    expect(boton()).toBeDisabled()
    expect(boton()).toHaveTextContent('Agregando...')
  })

  it('si el servidor responde error (por ejemplo sin stock), muestra el mensaje y el botón queda listo', async () => {
    agregar.mockRejectedValue(new Error('No hay stock suficiente de Acuarela 24 pastillas. Disponible: 2, ya tienes 2 en el carrito'))
    const usuario = montar()

    await usuario.click(boton())

    expect(await screen.findByRole('alert')).toHaveTextContent('No hay stock suficiente')
    expect(boton()).toBeEnabled()
    expect(boton()).toHaveTextContent('Agregar al carrito')
  })

  it('con stock 0 el botón dice "Sin stock" y está desactivado', () => {
    montar({ agregable: true, stock: 0 })
    expect(boton()).toBeDisabled()
    expect(boton()).toHaveTextContent('Sin stock')
  })

  it('sin sesión lleva al login y no llama al carrito', async () => {
    const usuario = montar({ agregable: true }, false)

    await usuario.click(boton())

    await waitFor(() => expect(screen.getByText('Pantalla de login')).toBeInTheDocument())
    expect(agregar).not.toHaveBeenCalled()
  })

  it('el botón no navega al detalle del producto', async () => {
    agregar.mockResolvedValue(carrito(1))
    const usuario = montar()

    await usuario.click(boton())

    expect(screen.queryByText('Detalle del producto')).not.toBeInTheDocument()
  })
})
