import { useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { Aviso } from '../../components/admin/Aviso'
import { BarraFiltros } from '../../components/admin/BarraFiltros'
import { useConfirmar } from '../../components/admin/useConfirmar'
import { Cargando, ErrorApi } from '../../components/Estado'
import { ordenarProductos, paginar, type CampoOrden, type Orden } from '../../data/listaProductos'
import { STOCK_BAJO } from '../../data/negocio'
import { useApi } from '../../hooks'
import { catalogoApi, inventarioApi, precioCLP, productoARequest, urlImagen } from '../../services/artcrate.service'
import type { Producto } from '../../types'

const FILTROS = [
  { clave: '', texto: 'Todos' },
  { clave: 'activos', texto: 'Activos' },
  { clave: 'inactivos', texto: 'Inactivos' },
  { clave: 'stock-bajo', texto: 'Stock bajo' },
]

export function Productos() {
  const [params, setParams] = useSearchParams()
  const filtro = params.get('filtro') ?? ''
  const [version, setVersion] = useState(0)
  const [busqueda, setBusqueda] = useState('')
  const [orden, setOrden] = useState<Orden>({ campo: 'estado', ascendente: true })
  const [pagina, setPagina] = useState(1)
  // el formulario de producto manda su mensaje de éxito al volver a la lista
  const [aviso, setAviso] = useState<string | null>((useLocation().state as { aviso?: string } | null)?.aviso ?? null)
  const [errorAccion, setErrorAccion] = useState<string | null>(null)
  const [confirmar, dialogo] = useConfirmar()
  const productos = useApi(() => catalogoApi.productos(), [version])
  const stock = useApi(inventarioApi.todos, [version])

  const unidades = (id: number) => stock.datos?.find((s) => s.productoId === id)?.cantidad ?? 0
  const cumple = (p: Producto, clave: string) =>
    clave === 'activos' ? p.activo
    : clave === 'inactivos' ? !p.activo
    : clave === 'stock-bajo' ? p.activo && unidades(p.id) <= STOCK_BAJO
    : true
  const texto = busqueda.trim().toLowerCase()
  const filtrados = (productos.datos ?? [])
    .filter((p) => cumple(p, filtro))
    .filter((p) => !texto || `${p.sku} ${p.nombre} ${p.categoriaNombre}`.toLowerCase().includes(texto))
  const { filas, actual, paginas } = paginar(ordenarProductos(filtrados, orden, unidades), pagina)

  function ordenar(campo: CampoOrden) {
    setOrden((o) => ({ campo, ascendente: o.campo === campo ? !o.ascendente : true }))
    setPagina(1)
  }

  const columna = (campo: CampoOrden, titulo: string, clase = '') => (
    <th className={clase} aria-sort={orden.campo === campo ? (orden.ascendente ? 'ascending' : 'descending') : undefined}>
      <button type="button" className="boton-orden" onClick={() => ordenar(campo)}>
        {titulo} <span aria-hidden="true">{orden.campo === campo ? (orden.ascendente ? '▲' : '▼') : '↕'}</span>
      </button>
    </th>
  )

  // Los productos no se eliminan (pueden estar en pedidos ya vendidos): se activan o desactivan
  async function cambiarEstado(p: Producto) {
    if (p.activo && !(await confirmar({ titulo: 'Desactivar producto', mensaje: `"${p.nombre}" dejará de mostrarse en la tienda.`, boton: 'Desactivar', peligro: true }))) return
    setErrorAccion(null)
    setAviso(null)
    try {
      await catalogoApi.actualizar(p.id, productoARequest(p, !p.activo))
      setAviso(`"${p.nombre}" quedó ${p.activo ? 'desactivado' : 'activo'}.`)
      setVersion((v) => v + 1)
    } catch (e) {
      setErrorAccion((e as Error).message)
    }
  }

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
        <h1 className="mb-0">Productos</h1>
        <Link className="btn btn-primary" to="/admin/productos/nuevo">Nuevo producto</Link>
      </div>
      <p className="text-secondary small">Los productos no se eliminan, para conservar el historial de ventas: se desactivan.</p>

      <Aviso texto={aviso} onCerrar={() => setAviso(null)} />
      <BarraFiltros
        filtros={FILTROS.map((f) => ({ ...f, total: (productos.datos ?? []).filter((p) => cumple(p, f.clave)).length }))}
        activo={filtro}
        onFiltro={(clave) => { setParams(clave ? { filtro: clave } : {}); setPagina(1) }}
        busqueda={busqueda}
        onBusqueda={(t) => { setBusqueda(t); setPagina(1) }}
        placeholder="Buscar por nombre, SKU o categoría"
      />

      {productos.cargando && !productos.datos && <Cargando />}
      {(productos.error ?? errorAccion) && <ErrorApi mensaje={(productos.error ?? errorAccion)!} />}
      {productos.datos && (
        <>
          <div className="table-responsive">
            <table className="table align-middle tabla-admin">
              <thead>
                <tr>
                  {columna('nombre', 'Producto')}
                  {columna('categoria', 'Categoría')}
                  {columna('precio', 'Precio', 'text-end')}
                  {columna('stock', 'Stock', 'text-end')}
                  {columna('estado', 'Estado')}
                  <th><span className="visually-hidden">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {filas.map((p) => (
                  <tr key={p.id} className={p.activo ? '' : 'fila-inactiva'}>
                    <td className="celda-principal">
                      <div className="d-flex align-items-center gap-3">
                        <img className="imagen-carrito" src={urlImagen(p.imagenUrl)} alt="" />
                        <div>
                          <Link className="fw-semibold text-decoration-none" to={`/admin/productos/${p.id}`}>{p.nombre}</Link>
                          <div className="small text-secondary text-nowrap">{p.sku}</div>
                        </div>
                      </div>
                    </td>
                    <td data-label="Categoría">{p.categoriaNombre}</td>
                    <td data-label="Precio" className="text-end">{precioCLP(p.precio)}</td>
                    <td data-label="Stock" className="text-end">
                      <span className={`badge ${unidades(p.id) === 0 ? 'text-bg-danger' : unidades(p.id) <= STOCK_BAJO ? 'text-bg-warning' : 'text-bg-light border'}`}>{unidades(p.id)}</span>
                    </td>
                    <td data-label="Estado"><span className={`badge ${p.activo ? 'text-bg-success' : 'text-bg-secondary'}`}>{p.activo ? 'Activo' : 'Inactivo'}</span></td>
                    <td className="celda-acciones text-nowrap text-end">
                      <Link className="btn btn-sm btn-outline-secondary me-2" to={`/admin/productos/${p.id}`}>Editar</Link>
                      <button type="button" className={`btn btn-sm ${p.activo ? 'btn-outline-danger' : 'btn-outline-success'}`} onClick={() => cambiarEstado(p)}>
                        {p.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
                {filas.length === 0 && <tr><td colSpan={6} className="celda-principal text-center text-secondary py-4">No hay productos en esta vista.</td></tr>}
              </tbody>
            </table>
          </div>
          {paginas > 1 && (
            <nav className="d-flex justify-content-between align-items-center mt-3" aria-label="Páginas de productos">
              <button type="button" className="btn btn-sm btn-outline-secondary" disabled={actual === 1} onClick={() => setPagina(actual - 1)}>← Anterior</button>
              <span className="small text-secondary">Página {actual} de {paginas} · {filtrados.length} productos</span>
              <button type="button" className="btn btn-sm btn-outline-secondary" disabled={actual === paginas} onClick={() => setPagina(actual + 1)}>Siguiente →</button>
            </nav>
          )}
        </>
      )}
      {dialogo}
    </>
  )
}
