export const API_URL = 'http://localhost:8080'

export type Metodo = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface Endpoint {
  etiqueta: string
  metodo: Metodo
  ruta: string
  cuerpo?: string
}

export interface Respuesta {
  ok: boolean
  status: number
  statusText: string
  ms: number
  datos: unknown
}

export const ENDPOINTS: Endpoint[] = [
  { etiqueta: 'Categorías', metodo: 'GET', ruta: '/api/categorias' },
  { etiqueta: 'Productos', metodo: 'GET', ruta: '/api/productos' },
  { etiqueta: 'Inventario', metodo: 'GET', ruta: '/api/inventario' },
  { etiqueta: 'Usuarios', metodo: 'GET', ruta: '/api/usuarios' },
  { etiqueta: 'Pedidos', metodo: 'GET', ruta: '/api/pedidos' },
  { etiqueta: 'Carrito (usuario 1)', metodo: 'GET', ruta: '/api/carritos/1' },
  { etiqueta: 'Pago (id 1)', metodo: 'GET', ruta: '/api/pagos/1' },
]

export async function llamarApi(
  base: string,
  metodo: Metodo,
  ruta: string,
  cuerpo?: string,
): Promise<Respuesta> {
  const inicio = performance.now()
  const tieneCuerpo = metodo !== 'GET' && metodo !== 'DELETE' && !!cuerpo?.trim()

  const res = await fetch(base + ruta, {
    method: metodo,
    headers: tieneCuerpo ? { 'Content-Type': 'application/json' } : undefined,
    body: tieneCuerpo ? cuerpo : undefined,
  })

  const texto = await res.text()
  let datos: unknown = texto
  try {
    datos = texto ? JSON.parse(texto) : null
  } catch {
    // la respuesta no es JSON, se muestra como texto
  }

  return {
    ok: res.ok,
    status: res.status,
    statusText: res.statusText,
    ms: Math.round(performance.now() - inicio),
    datos,
  }
}
