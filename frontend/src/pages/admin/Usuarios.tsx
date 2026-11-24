import { useState } from 'react'
import { Cargando, ErrorApi } from '../../components/Estado'
import { useSesion } from '../../context/SesionContext'
import { useApi } from '../../hooks'
import { pedidosApi, usuariosApi } from '../../services/artcrate.service'
import type { Usuario } from '../../types'

const FILTROS = [
  { clave: '', texto: 'Todos' },
  { clave: 'ADMIN', texto: 'Administradores' },
  { clave: 'CLIENTE', texto: 'Clientes' },
  { clave: 'INACTIVOS', texto: 'Desactivados' },
]

export function Usuarios() {
  const { usuario: yo } = useSesion()
  const [version, setVersion] = useState(0)
  const [filtro, setFiltro] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [errorAccion, setErrorAccion] = useState<string | null>(null)
  const usuarios = useApi(usuariosApi.todos, [version])
  const pedidos = useApi(pedidosApi.todos, [])

  const cumple = (u: Usuario, clave: string) => (clave === 'INACTIVOS' ? !u.activo : clave ? u.rol === clave : true)
  const texto = busqueda.trim().toLowerCase()
  const lista = (usuarios.datos ?? [])
    .filter((u) => cumple(u, filtro))
    .filter((u) => !texto || `${u.nombre} ${u.apellido} ${u.correo}`.toLowerCase().includes(texto))
  const cantidadPedidos = (id: number) => (pedidos.datos ?? []).filter((p) => p.usuarioId === id).length

  async function cambiar(u: Usuario, cambios: { rol?: Usuario['rol']; activo?: boolean }, confirmacion?: string) {
    if (confirmacion && !window.confirm(confirmacion)) return
    setErrorAccion(null)
    try {
      await usuariosApi.actualizar(u, cambios)
      setVersion((v) => v + 1)
    } catch (e) {
      setErrorAccion((e as Error).message)
    }
  }

  return (
    <>
      <h1 className="mb-2">Usuarios</h1>
      <p className="text-secondary small">
        Los usuarios no se eliminan, para conservar el historial de sus pedidos. Si es necesario, desactívalos y no podrán iniciar sesión.
      </p>

      <div className="d-flex flex-wrap gap-3 align-items-center mb-3">
        <ul className="nav nav-pills gap-2">
          {FILTROS.map((f) => (
            <li className="nav-item" key={f.clave}>
              <button className={`nav-link ${filtro === f.clave ? 'active' : ''}`} onClick={() => setFiltro(f.clave)}>
                {f.texto} ({(usuarios.datos ?? []).filter((u) => cumple(u, f.clave)).length})
              </button>
            </li>
          ))}
        </ul>
        <input
          className="form-control ms-md-auto" style={{ maxWidth: 280 }} type="search" placeholder="Buscar por nombre o correo"
          aria-label="Buscar usuario" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      {usuarios.cargando && !usuarios.datos && <Cargando />}
      {(usuarios.error ?? errorAccion) && <ErrorApi mensaje={(usuarios.error ?? errorAccion)!} />}
      {usuarios.datos && (
        <div className="table-responsive">
          <table className="table align-middle">
            <thead><tr><th>Nombre</th><th>Correo</th><th>Región</th><th>Rol</th><th className="text-end">Pedidos</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {lista.map((u) => {
                const esYo = u.id === yo?.id // no puedes quitarte tu propio acceso de administrador
                return (
                  <tr key={u.id}>
                    <td>{u.nombre} {u.apellido}{esYo && <span className="badge text-bg-light border ms-2">Tú</span>}</td>
                    <td>{u.correo}</td>
                    <td>{u.region ?? '—'}</td>
                    <td><span className={`badge ${u.rol === 'ADMIN' ? 'text-bg-primary' : 'text-bg-light border'}`}>{u.rol === 'ADMIN' ? 'Administrador' : 'Cliente'}</span></td>
                    <td className="text-end">{cantidadPedidos(u.id)}</td>
                    <td><span className={`badge ${u.activo ? 'text-bg-success' : 'text-bg-secondary'}`}>{u.activo ? 'Activo' : 'Desactivado'}</span></td>
                    <td className="text-nowrap text-end">
                      <button
                        className="btn btn-sm btn-outline-secondary me-2" disabled={esYo}
                        onClick={() => cambiar(u, { rol: u.rol === 'ADMIN' ? 'CLIENTE' : 'ADMIN' },
                          u.rol === 'ADMIN' ? `¿Quitar el rol de administrador a ${u.nombre}?` : `¿Dar acceso de administrador a ${u.nombre}?`)}
                      >
                        {u.rol === 'ADMIN' ? 'Hacer cliente' : 'Hacer admin'}
                      </button>
                      <button
                        className="btn btn-sm btn-outline-secondary" disabled={esYo}
                        onClick={() => cambiar(u, { activo: !u.activo }, u.activo ? `¿Desactivar a ${u.nombre}? No podrá iniciar sesión.` : undefined)}
                      >
                        {u.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                )
              })}
              {lista.length === 0 && <tr><td colSpan={7} className="text-center text-secondary py-4">No hay usuarios en esta vista.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
