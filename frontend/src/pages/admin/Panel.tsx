import { Link } from 'react-router-dom'
import { Cargando, ErrorApi } from '../../components/Estado'
import { InsigniaEstado } from '../../components/InsigniaEstado'
import { ESTADOS_VENDIDOS, STOCK_BAJO } from '../../data/negocio'
import { useApi } from '../../hooks'
import { catalogoApi, fechaHora, inventarioApi, pedidosApi, precioCLP, usuariosApi } from '../../services/artcrate.service'

// Suma cantidades y montos por clave (producto o categoría) y deja los más altos primero
function agrupar(filas: { clave: string; cantidad: number; monto: number }[]) {
  const mapa = new Map<string, { clave: string; cantidad: number; monto: number }>()
  for (const f of filas) {
    const actual = mapa.get(f.clave) ?? { clave: f.clave, cantidad: 0, monto: 0 }
    actual.cantidad += f.cantidad
    actual.monto += f.monto
    mapa.set(f.clave, actual)
  }
  return [...mapa.values()].sort((a, b) => b.monto - a.monto)
}

export function Panel() {
  const productos = useApi(() => catalogoApi.productos(), [])
  const pedidos = useApi(pedidosApi.todos, [])
  const stock = useApi(inventarioApi.todos, [])
  const usuarios = useApi(usuariosApi.todos, [])

  const error = productos.error ?? pedidos.error ?? stock.error ?? usuarios.error
  if (productos.cargando || pedidos.cargando || stock.cargando || usuarios.cargando) return <Cargando />
  if (error || !productos.datos || !pedidos.datos || !stock.datos || !usuarios.datos) {
    return <ErrorApi mensaje={error ?? 'No pudimos cargar el panel'} />
  }

  const cliente = (id: number) => {
    const u = usuarios.datos!.find((x) => x.id === id)
    return u ? `${u.nombre} ${u.apellido}` : `Usuario ${id}`
  }
  const unidadesEnStock = (id: number) => stock.datos!.find((s) => s.productoId === id)?.cantidad ?? 0

  const vendidos = pedidos.datos.filter((p) => ESTADOS_VENDIDOS.includes(p.estado))
  const ventas = vendidos.reduce((total, p) => total + p.total, 0)
  const pendientes = pedidos.datos.filter((p) => p.estado === 'PENDIENTE_PAGO')
  const porEnviar = pedidos.datos.filter((p) => p.estado === 'PAGADO')
  const ultimos = [...pedidos.datos].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 5)

  const activos = productos.datos.filter((p) => p.activo)
  const sinStock = activos.filter((p) => unidadesEnStock(p.id) === 0)
  const stockBajo = activos.filter((p) => unidadesEnStock(p.id) > 0 && unidadesEnStock(p.id) <= STOCK_BAJO)

  // Lo más vendido y las ventas por categoría salen de los productos de los pedidos confirmados
  const lineas = vendidos.flatMap((p) => p.items)
  const masVendidos = agrupar(lineas.map((i) => ({ clave: i.nombre, cantidad: i.cantidad, monto: i.subtotal }))).slice(0, 5)
  const porCategoria = agrupar(
    lineas.map((i) => ({
      clave: productos.datos!.find((p) => p.id === i.productoId)?.categoriaNombre ?? 'Otros',
      cantidad: i.cantidad,
      monto: i.subtotal,
    })),
  )
  const maxProducto = masVendidos[0]?.monto || 1
  const maxCategoria = porCategoria[0]?.monto || 1

  const indicadores = [
    { titulo: 'Ventas confirmadas', valor: precioCLP(ventas), detalle: `${vendidos.length} ${vendidos.length === 1 ? 'pedido' : 'pedidos'}`, a: '/admin/pedidos' },
    { titulo: 'Por enviar', valor: String(porEnviar.length), detalle: porEnviar.length === 1 ? 'pedido pagado' : 'pedidos pagados', a: '/admin/pedidos?estado=PAGADO' },
    { titulo: 'Pendientes de pago', valor: String(pendientes.length), detalle: precioCLP(pendientes.reduce((t, p) => t + p.total, 0)), a: '/admin/pedidos?estado=PENDIENTE_PAGO' },
    { titulo: 'Stock bajo', valor: String(stockBajo.length + sinStock.length), detalle: `${sinStock.length} sin stock`, a: '/admin/productos?filtro=stock-bajo' },
  ]

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <h1 className="mb-0">Panel de administración</h1>
        <div className="d-flex flex-wrap gap-2">
          <Link className="btn btn-primary" to="/admin/productos/nuevo">Nuevo producto</Link>
          <Link className="btn btn-outline-secondary" to="/admin/pedidos">Ver pedidos</Link>
          <Link className="btn btn-outline-secondary" to="/">Ver tienda</Link>
        </div>
      </div>

      <div className="row row-cols-1 row-cols-md-2 row-cols-xl-4 g-4 mb-4">
        {indicadores.map((i) => (
          <div className="col" key={i.titulo}>
            <Link to={i.a} className="card tarjeta-indicador tarjeta-kpi h-100"><div className="card-body">
              <p className="text-secondary mb-1">{i.titulo}</p>
              <p className="indicador mb-0">{i.valor}</p>
              <p className="small text-secondary mb-0">{i.detalle}</p>
            </div></Link>
          </div>
        ))}
      </div>

      <div className="row g-4 mb-4">
        <section className="col-lg-6">
          <div className="card formulario-card h-100"><div className="card-body">
            <h2 className="h5">Pedidos por enviar</h2>
            {porEnviar.length === 0 ? <p className="text-secondary mb-0">No hay pedidos esperando envío.</p> : (
              <ul className="list-group list-group-flush">
                {porEnviar.slice(0, 5).map((p) => (
                  <li className="list-group-item d-flex justify-content-between align-items-center px-0" key={p.id}>
                    <span>#{p.id} · {cliente(p.usuarioId)} <span className="text-secondary small">· {precioCLP(p.total)}</span></span>
                    <Link className="btn btn-sm btn-outline-secondary" to={`/admin/pedidos/${p.id}`}>Gestionar</Link>
                  </li>
                ))}
              </ul>
            )}
          </div></div>
        </section>
        <section className="col-lg-6">
          <div className="card formulario-card h-100"><div className="card-body">
            <h2 className="h5">Productos con poco stock</h2>
            {stockBajo.length + sinStock.length === 0 ? <p className="text-secondary mb-0">Todos los productos tienen stock suficiente.</p> : (
              <ul className="list-group list-group-flush">
                {[...sinStock, ...stockBajo].slice(0, 5).map((p) => (
                  <li className="list-group-item d-flex justify-content-between align-items-center px-0" key={p.id}>
                    <span>{p.nombre} <span className={`badge ms-1 ${unidadesEnStock(p.id) === 0 ? 'text-bg-danger' : 'text-bg-warning'}`}>
                      {unidadesEnStock(p.id) === 0 ? 'Sin stock' : `${unidadesEnStock(p.id)} ${unidadesEnStock(p.id) === 1 ? 'unidad' : 'unidades'}`}</span></span>
                    <Link className="btn btn-sm btn-outline-secondary" to={`/admin/productos/${p.id}`}>Reponer</Link>
                  </li>
                ))}
              </ul>
            )}
          </div></div>
        </section>
      </div>

      <section className="card formulario-card mb-4"><div className="card-body">
        <div className="d-flex justify-content-between align-items-center">
          <h2 className="h5">Últimos pedidos</h2>
          <Link to="/admin/pedidos">Ver todos →</Link>
        </div>
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead><tr><th>N°</th><th>Cliente</th><th>Fecha</th><th>Estado</th><th className="text-end">Total</th><th></th></tr></thead>
            <tbody>
              {ultimos.map((p) => (
                <tr key={p.id}>
                  <td>#{p.id}</td><td>{cliente(p.usuarioId)}</td><td>{fechaHora(p.fecha)}</td>
                  <td><InsigniaEstado estado={p.estado} /></td><td className="text-end">{precioCLP(p.total)}</td>
                  <td className="text-end"><Link className="btn btn-sm btn-outline-secondary" to={`/admin/pedidos/${p.id}`}>Ver detalle</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div></section>

      <div className="row g-4">
        <section className="col-lg-6">
          <div className="card formulario-card h-100"><div className="card-body">
            <h2 className="h5">Productos más vendidos</h2>
            {masVendidos.length === 0 ? <p className="text-secondary mb-0">Aún no hay ventas confirmadas.</p> : masVendidos.map((m) => (
              <div className="mb-3" key={m.clave}>
                <div className="d-flex justify-content-between small"><span>{m.clave}</span><span>{m.cantidad} un. · {precioCLP(m.monto)}</span></div>
                <div className="barra-ventas"><div style={{ width: `${(m.monto / maxProducto) * 100}%` }} /></div>
              </div>
            ))}
          </div></div>
        </section>
        <section className="col-lg-6">
          <div className="card formulario-card h-100"><div className="card-body">
            <h2 className="h5">Ventas por categoría</h2>
            {porCategoria.length === 0 ? <p className="text-secondary mb-0">Aún no hay ventas confirmadas.</p> : porCategoria.map((c) => (
              <div className="mb-3" key={c.clave}>
                <div className="d-flex justify-content-between small"><span>{c.clave}</span><span>{precioCLP(c.monto)}</span></div>
                <div className="barra-ventas"><div style={{ width: `${(c.monto / maxCategoria) * 100}%` }} /></div>
              </div>
            ))}
          </div></div>
        </section>
      </div>
    </>
  )
}
