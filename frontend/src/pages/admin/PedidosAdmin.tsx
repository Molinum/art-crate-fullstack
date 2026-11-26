import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BarraFiltros } from '../../components/admin/BarraFiltros'
import { Cargando, ErrorApi } from '../../components/Estado'
import { InsigniaEstado } from '../../components/InsigniaEstado'
import { ETIQUETA_ESTADO } from '../../data/negocio'
import { useApi } from '../../hooks'
import { fechaHora, pedidosApi, precioCLP, usuariosApi } from '../../services/artcrate.service'
import type { EstadoPedido } from '../../types'

const ESTADOS = Object.keys(ETIQUETA_ESTADO) as EstadoPedido[]

export function PedidosAdmin() {
  const [params, setParams] = useSearchParams()
  const estado = params.get('estado') ?? ''
  const [busqueda, setBusqueda] = useState('')
  const pedidos = useApi(pedidosApi.todos, [])
  const usuarios = useApi(usuariosApi.todos, [])

  const cliente = (id: number) => {
    const u = usuarios.datos?.find((x) => x.id === id)
    return u ? `${u.nombre} ${u.apellido}` : `Usuario ${id}`
  }
  const cuantos = (e: string) => (pedidos.datos ?? []).filter((p) => !e || p.estado === e).length
  // los más recientes primero
  const texto = busqueda.trim().toLowerCase().replace(/^#/, '')
  const coincide = (p: { id: number; usuarioId: number }) => !texto || String(p.id) === texto || cliente(p.usuarioId).toLowerCase().includes(texto)
  const lista = [...(pedidos.datos ?? [])].filter((p) => !estado || p.estado === estado).filter(coincide).sort((a, b) => b.fecha.localeCompare(a.fecha))

  return (
    <>
      <h1 className="mb-3">Pedidos</h1>
      <BarraFiltros
        filtros={[{ clave: '', texto: 'Todos' }, ...ESTADOS.map((e) => ({ clave: e as string, texto: ETIQUETA_ESTADO[e] }))]
          .map((f) => ({ ...f, total: cuantos(f.clave) }))}
        activo={estado}
        onFiltro={(clave) => setParams(clave ? { estado: clave } : {})}
        busqueda={busqueda}
        onBusqueda={setBusqueda}
        placeholder="Buscar por N° de pedido o cliente"
      />

      {pedidos.cargando && !pedidos.datos && <Cargando />}
      {pedidos.error && <ErrorApi mensaje={pedidos.error} />}
      {pedidos.datos && (
        <div className="table-responsive">
          <table className="table align-middle tabla-admin">
            <thead><tr><th>N°</th><th>Fecha</th><th>Cliente</th><th>Despacho</th><th className="text-end">Total</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {lista.map((p) => (
                <tr key={p.id}>
                  <td className="celda-principal fw-semibold">#{p.id}</td>
                  <td data-label="Fecha">{fechaHora(p.fecha)}</td>
                  <td data-label="Cliente">{cliente(p.usuarioId)}</td>
                  <td data-label="Despacho">{p.comuna}, {p.region}</td>
                  <td data-label="Total" className="text-end">{precioCLP(p.total)}</td>
                  <td data-label="Estado"><InsigniaEstado estado={p.estado} /></td>
                  <td className="celda-acciones text-end"><Link className="btn btn-sm btn-outline-secondary" to={`/admin/pedidos/${p.id}`}>Ver detalle</Link></td>
                </tr>
              ))}
              {lista.length === 0 && <tr><td colSpan={7} className="celda-principal text-center text-secondary py-4">No hay pedidos en esta vista.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
