import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Carrito, Producto } from '../types'
import { CLAVE_TOKEN, catalogoApi, pagosApi, precioCLP, productoARequest, unidadesCarrito, usuariosApi } from './artcrate.service'

const respuesta = (status: number, cuerpo: unknown) =>
  Promise.resolve(new Response(cuerpo === undefined ? '' : JSON.stringify(cuerpo), { status }))

describe('formatos', () => {
  it('precioCLP usa separador de miles chileno', () => {
    expect(precioCLP(12990)).toBe('$12.990')
    expect(precioCLP(0)).toBe('$0')
    expect(precioCLP(1234567)).toBe('$1.234.567')
  })

  it('unidadesCarrito suma las cantidades, no las líneas', () => {
    const carrito = { items: [{ cantidad: 2 }, { cantidad: 3 }, { cantidad: 1 }] } as Carrito
    expect(unidadesCarrito(carrito)).toBe(6)
    expect(unidadesCarrito({ items: [] } as unknown as Carrito)).toBe(0)
  })
})

describe('productoARequest', () => {
  const producto = {
    id: 1, sku: 'ART-1', nombre: 'Acrílico', descripcion: 'desc', precio: 1000, imagenUrl: 'assets/img/x.svg',
    categoriaId: 4, categoriaNombre: 'Pinturas', activo: true, marca: null, formato: undefined, contenido: '12 colores',
  } as unknown as Producto

  it('copia los datos y fija el estado pedido (los productos no se eliminan, se desactivan)', () => {
    expect(productoARequest(producto, false)).toMatchObject({ sku: 'ART-1', precio: 1000, categoriaId: 4, activo: false })
    expect(productoARequest(producto, true).activo).toBe(true)
  })

  it('los campos de ficha técnica vacíos viajan como texto vacío, no como null', () => {
    const r = productoARequest(producto, true)
    expect(r.marca).toBe('')
    expect(r.formato).toBe('')
    expect(r.contenido).toBe('12 colores')
  })
})

describe('llamadas a la API', () => {
  const fetchMock = vi.fn()
  const assign = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('location', { assign })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockReset()
    assign.mockReset()
  })

  it('sin sesión no manda Authorization', async () => {
    fetchMock.mockReturnValue(respuesta(200, []))
    await catalogoApi.categorias()
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined()
  })

  it('con sesión manda el token como Bearer', async () => {
    localStorage.setItem(CLAVE_TOKEN, 'abc.def.ghi')
    fetchMock.mockReturnValue(respuesta(200, []))
    await catalogoApi.categorias()
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer abc.def.ghi')
  })

  it('el login devuelve token y usuario', async () => {
    fetchMock.mockReturnValue(respuesta(200, { token: 't', usuario: { id: 2 } }))
    const r = await usuariosApi.login('a@b.cl', 'Clave1234')
    expect(r.token).toBe('t')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ correo: 'a@b.cl', password: 'Clave1234' })
  })

  it('pagar con tarjeta envía solo los últimos 4 dígitos', async () => {
    fetchMock.mockReturnValue(respuesta(201, { id: 1, estado: 'APROBADO' }))
    await pagosApi.pagar(9, 'TARJETA', '4242')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ pedidoId: 9, metodo: 'TARJETA', ultimosDigitos: '4242' })
  })

  it('un 401 con sesión iniciada cierra la sesión y manda a /login', async () => {
    localStorage.setItem(CLAVE_TOKEN, 'vencido')
    localStorage.setItem('artcrate.usuario', '{}')
    fetchMock.mockReturnValue(respuesta(401, { message: 'x' }))

    await expect(catalogoApi.categorias()).rejects.toThrow(/sesión expiró/i)

    expect(localStorage.getItem(CLAVE_TOKEN)).toBeNull()
    expect(localStorage.getItem('artcrate.usuario')).toBeNull()
    expect(assign).toHaveBeenCalledWith('/login')
  })

  it('un 401 sin sesión (login fallido) muestra el mensaje del servidor y no redirige', async () => {
    fetchMock.mockReturnValue(respuesta(401, { message: 'Correo o contraseña incorrectos' }))
    await expect(usuariosApi.login('a@b.cl', 'mala')).rejects.toThrow('Correo o contraseña incorrectos')
    expect(assign).not.toHaveBeenCalled()
  })

  it('los errores 4xx muestran el mensaje del servidor', async () => {
    fetchMock.mockReturnValue(respuesta(409, { message: 'El pedido no está pendiente de pago' }))
    await expect(pagosApi.pagar(1, 'TRANSFERENCIA')).rejects.toThrow('El pedido no está pendiente de pago')
  })

  it('los errores 5xx muestran un mensaje genérico, sin detalles internos', async () => {
    fetchMock.mockReturnValue(respuesta(500, { message: 'NullPointerException en PedidoService' }))
    await expect(catalogoApi.categorias()).rejects.toThrow(/Ocurrió un problema/)
  })

  it('si no hay red muestra el mensaje genérico', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(catalogoApi.categorias()).rejects.toThrow(/Ocurrió un problema/)
  })
})
