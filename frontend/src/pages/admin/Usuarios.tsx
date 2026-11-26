import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Aviso } from '../../components/admin/Aviso'
import { useConfirmar } from '../../components/admin/useConfirmar'
import { BarraFiltros } from '../../components/admin/BarraFiltros'
import { Cargando, ErrorApi } from '../../components/Estado'
import { useSesion } from '../../context/SesionContext'
import { ETIQUETA_ROL } from '../../data/negocio'
import { useApi } from '../../hooks'
import { pedidosApi, usuariosApi } from '../../services/artcrate.service'
import type { Usuario } from '../../types'

const FILTROS = [
  { clave: '', texto: 'Todos' },
  { clave: 'ADMIN', texto: 'Administradores' },
  { clave: 'ENCARGADO', texto: 'Encargados' },
  { clave: 'CLIENTE', texto: 'Clientes' },
  { clave: 'INACTIVOS', texto: 'Desactivados' },
]

const ROLES: Usuario['rol'][] = ['CLIENTE', 'ENCARGADO', 'ADMIN']

// Qué podrá hacer la persona con cada rol (se muestra antes de confirmar el cambio)
const ALCANCE: Record<Usuario['rol'], string> = {
  CLIENTE: 'solo podrá comprar y ver sus propios pedidos',
  ENCARGADO: 'podrá gestionar productos, categorías, stock y pedidos, pero no usuarios',
  ADMIN: 'podrá gestionar todo, incluidos los usuarios y tu propio acceso',
}

export function Usuarios() {
  const { usuario: yo } = useSesion()
  const [version, setVersion] = useState(0)
  const [params, setParams] = useSearchParams()
  const filtro = params.get('filtro') ?? ''
  const [aviso, setAviso] = useState<string | null>(null)
  const [confirmar, dialogo] = useConfirmar()
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

  async function cambiar(u: Usuario, cambios: { rol?: Usuario['rol']; activo?: boolean }, hecho: string, confirmacion?: Parameters<typeof confirmar>[0]) {
    if (confirmacion && !(await confirmar(confirmacion))) return
    setErrorAccion(null)
    setAviso(null)
    try {
      await usuariosApi.actualizar(u, cambios)
      setAviso(hecho)
      setVersion((v) => v + 1)
    } catch (e) {
      setErrorAccion((e as Error).message)
    }
  }

  const cambiarRol = (u: Usuario, rol: Usuario['rol']) =>
    cambiar(u, { rol }, `${u.nombre} ahora es ${ETIQUETA_ROL[rol].toLowerCase()}.`, {
      titulo: 'Cambiar rol',
      mensaje: `${u.nombre} (${u.correo}) pasará a ser ${ETIQUETA_ROL[rol].toLowerCase()}: ${ALCANCE[rol]}.`,
      boton: 'Cambiar rol',
      peligro: rol === 'ADMIN' || u.rol === 'ADMIN',
    })

  return (
    <>
      <h1 className="mb-2">Usuarios</h1>
      <p className="text-secondary small">
        Los usuarios no se eliminan, para conservar el historial de sus pedidos. Si es necesario, desactívalos y no podrán iniciar sesión.
      </p>

      <Aviso texto={aviso} onCerrar={() => setAviso(null)} />
      <BarraFiltros
        filtros={FILTROS.map((f) => ({ ...f, total: (usuarios.datos ?? []).filter((u) => cumple(u, f.clave)).length }))}
        activo={filtro}
        onFiltro={(clave) => setParams(clave ? { filtro: clave } : {})}
        busqueda={busqueda}
        onBusqueda={setBusqueda}
        placeholder="Buscar por nombre o correo"
      />

      {usuarios.cargando && !usuarios.datos && <Cargando />}
      {(usuarios.error ?? errorAccion) && <ErrorApi mensaje={(usuarios.error ?? errorAccion)!} />}
      {usuarios.datos && (
        <div className="table-responsive">
          <table className="table align-middle tabla-admin">
            <thead><tr><th>Nombre</th><th>Correo</th><th>Región</th><th>Rol</th><th className="text-end">Pedidos</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {lista.map((u) => {
                const esYo = u.id === yo?.id // no puedes quitarte tu propio acceso de administrador
                return (
                  <tr key={u.id}>
                    <td className="celda-principal fw-semibold">{u.nombre} {u.apellido}{esYo && <span className="badge text-bg-light border ms-2">Tú</span>}</td>
                    <td data-label="Correo">{u.correo}</td>
                    <td data-label="Región">{u.region ?? '—'}</td>
                    <td data-label="Rol">
                      {esYo ? <span className="badge text-bg-dark">{ETIQUETA_ROL[u.rol]}</span> : (
                        <select
                          className="form-select form-select-sm w-auto" aria-label={`Rol de ${u.nombre} ${u.apellido}`} value={u.rol}
                          onChange={(e) => cambiarRol(u, e.target.value as Usuario['rol'])}
                        >
                          {ROLES.map((r) => <option key={r} value={r}>{ETIQUETA_ROL[r]}</option>)}
                        </select>
                      )}
                    </td>
                    <td data-label="Pedidos" className="text-end">{cantidadPedidos(u.id)}</td>
                    <td data-label="Estado"><span className={`badge ${u.activo ? 'text-bg-success' : 'text-bg-secondary'}`}>{u.activo ? 'Activo' : 'Desactivado'}</span></td>
                    <td className="celda-acciones text-nowrap text-end">
                      {esYo ? <span className="small text-secondary">Tu cuenta no se edita aquí</span> : (
                        <>
                          <button
                            className={`btn btn-sm ${u.activo ? 'btn-outline-danger' : 'btn-outline-success'}`}
                            onClick={() => cambiar(u, { activo: !u.activo }, `${u.nombre} quedó ${u.activo ? 'desactivado' : 'activo'}.`,
                              u.activo ? { titulo: 'Desactivar usuario', mensaje: `${u.nombre} no podrá iniciar sesión.`, boton: 'Desactivar', peligro: true } : undefined)}
                          >
                            {u.activo ? 'Desactivar' : 'Activar'}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                )
              })}
              {lista.length === 0 && <tr><td colSpan={7} className="celda-principal text-center text-secondary py-4">No hay usuarios en esta vista.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {dialogo}
    </>
  )
}
