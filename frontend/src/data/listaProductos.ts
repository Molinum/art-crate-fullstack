import type { Producto } from '../types'

// Orden y paginación de la lista de productos del panel

export type CampoOrden = 'estado' | 'nombre' | 'categoria' | 'precio' | 'stock'

export interface Orden {
  campo: CampoOrden
  ascendente: boolean
}

export const POR_PAGINA = 10

export function ordenarProductos(productos: Producto[], orden: Orden, stock: (id: number) => number) {
  const porNombre = (a: Producto, b: Producto) => a.nombre.localeCompare(b.nombre, 'es')
  const comparar: Record<CampoOrden, (a: Producto, b: Producto) => number> = {
    estado: (a, b) => Number(b.activo) - Number(a.activo), // los activos primero
    nombre: porNombre,
    categoria: (a, b) => a.categoriaNombre.localeCompare(b.categoriaNombre, 'es'),
    precio: (a, b) => a.precio - b.precio,
    stock: (a, b) => stock(a.id) - stock(b.id),
  }
  const sentido = orden.ascendente ? 1 : -1
  // a igualdad, por nombre
  return [...productos].sort((a, b) => sentido * comparar[orden.campo](a, b) || porNombre(a, b))
}

// La página pedida se ajusta al rango válido (por ejemplo, al filtrar quedan menos páginas)
export function paginar<T>(lista: T[], pagina: number, porPagina = POR_PAGINA) {
  const paginas = Math.max(1, Math.ceil(lista.length / porPagina))
  const actual = Math.min(Math.max(1, pagina), paginas)
  return { filas: lista.slice((actual - 1) * porPagina, actual * porPagina), actual, paginas }
}
