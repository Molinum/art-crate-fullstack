import { Cargando, ErrorApi } from '../../components/Estado'
import { useApi } from '../../hooks'
import { catalogoApi, inventarioApi, pedidosApi, precioCLP } from '../../services/artcrate.service'

export function Panel() {
  const productos = useApi(() => catalogoApi.productos(), [])
  const pedidos = useApi(pedidosApi.todos, [])
  const stock = useApi(inventarioApi.todos, [])

  const error = productos.error ?? pedidos.error ?? stock.error
  if (productos.cargando || pedidos.cargando || stock.cargando) return <Cargando />
  if (error) return <ErrorApi mensaje={error} />

  const pendientes = pedidos.datos?.filter((p) => p.estado === 'PENDIENTE_PAGO').length ?? 0
  const ventas = pedidos.datos?.filter((p) => p.estado !== 'CANCELADO' && p.estado !== 'PENDIENTE_PAGO').reduce((s, p) => s + p.total, 0) ?? 0
  const sinStock = stock.datos?.filter((s) => s.cantidad === 0).length ?? 0

  const indicadores = [
    { titulo: 'Productos', valor: productos.datos?.length ?? 0 },
    { titulo: 'Pedidos', valor: pedidos.datos?.length ?? 0 },
    { titulo: 'Pendientes de pago', valor: pendientes },
    { titulo: 'Productos sin stock', valor: sinStock },
  ]

  return (
    <>
      <h1 className="mb-4">Panel de administración</h1>
      <div className="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-4 mb-4">
        {indicadores.map((i) => (
          <div className="col" key={i.titulo}>
            <div className="card tarjeta-indicador h-100"><div className="card-body">
              <p className="text-secondary mb-1">{i.titulo}</p>
              <p className="indicador mb-0">{i.valor}</p>
            </div></div>
          </div>
        ))}
      </div>
      <p className="precio">Ventas confirmadas: {precioCLP(ventas)}</p>
    </>
  )
}
