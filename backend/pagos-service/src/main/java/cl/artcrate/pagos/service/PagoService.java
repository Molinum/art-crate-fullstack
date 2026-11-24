package cl.artcrate.pagos.service;

import cl.artcrate.pagos.client.CambiarEstadoCliente;
import cl.artcrate.pagos.client.PedidoClient;
import cl.artcrate.pagos.client.PedidoCliente;
import cl.artcrate.pagos.dto.CrearPagoRequest;
import cl.artcrate.pagos.dto.PagoResponse;
import cl.artcrate.pagos.exception.ConflictoException;
import cl.artcrate.pagos.exception.ProhibidoException;
import cl.artcrate.pagos.exception.RecursoNoEncontradoException;
import cl.artcrate.pagos.exception.SolicitudInvalidaException;
import cl.artcrate.pagos.model.EstadoPago;
import cl.artcrate.pagos.model.MetodoPago;
import cl.artcrate.pagos.model.Pago;
import cl.artcrate.pagos.repository.PagoRepository;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

/** Lógica de negocio de los pagos (simulados). Consulta y actualiza el pedido en pedidos-service. */
@Service
public class PagoService {

    private static final String PENDIENTE_PAGO = "PENDIENTE_PAGO";
    private static final String PAGADO = "PAGADO";

    private final PagoRepository repository;
    private final PedidoClient pedidoClient;

    public PagoService(PagoRepository repository, PedidoClient pedidoClient) {
        this.repository = repository;
        this.pedidoClient = pedidoClient;
    }

    /**
     * Paga un pedido (simulado). Pasos:
     *   1) consultar el pedido (si no existe -> 404) y comprobar que sea del usuario que paga (si no -> 403)
     *   2) comprobar que esté PENDIENTE_PAGO (si no -> 409)
     *   3) decidir el resultado: transferencia siempre se aprueba; con tarjeta lo define el final del número
     *      (0002 rechazada por el banco, 9995 fondos insuficientes, 0069 tarjeta vencida; el resto se aprueba)
     *   4) guardar el pago (APROBADO o RECHAZADO) y, si se aprobó, marcar el pedido como PAGADO
     * Un pago rechazado queda registrado y el pedido sigue pendiente, para que el cliente reintente.
     * Si el paso 4 falla, se borra el pago para no dejar un pago aprobado sobre un pedido sin pagar.
     */
    public PagoResponse pagar(CrearPagoRequest datos, String usuarioId, boolean privilegiado) {
        PedidoCliente pedido = pedidoClient.obtenerPedido(datos.pedidoId());
        exigirPropio(pedido, usuarioId, privilegiado);

        if (!PENDIENTE_PAGO.equals(pedido.estado())) {
            throw new ConflictoException("El pedido " + pedido.id() + " no está pendiente de pago (estado actual: "
                    + pedido.estado() + ")");
        }
        if (datos.metodo() == MetodoPago.TARJETA && datos.ultimosDigitos() == null) {
            throw new SolicitudInvalidaException("Para pagar con tarjeta se necesitan los últimos 4 dígitos");
        }

        String motivo = datos.metodo() == MetodoPago.TARJETA ? motivoRechazo(datos.ultimosDigitos()) : null;

        Pago pago = new Pago();
        pago.setPedidoId(pedido.id());
        pago.setMonto(pedido.total()); // el monto lo define el pedido, no el cliente
        pago.setMetodo(datos.metodo());
        pago.setEstado(motivo == null ? EstadoPago.APROBADO : EstadoPago.RECHAZADO);
        pago.setMotivoRechazo(motivo);
        pago.setUltimosDigitos(datos.metodo() == MetodoPago.TARJETA ? datos.ultimosDigitos() : null);
        pago.setFecha(LocalDateTime.now());
        pago.setCodigoTransaccion(UUID.randomUUID().toString());
        Pago guardado = repository.save(pago);

        if (motivo == null) {
            try {
                pedidoClient.cambiarEstado(pedido.id(), new CambiarEstadoCliente(PAGADO));
            } catch (RuntimeException e) {
                repository.delete(guardado);
                throw e;
            }
        }
        return aRespuesta(guardado);
    }

    /** Tarjetas de prueba: el final del número decide si el banco rechaza el pago. */
    private String motivoRechazo(String ultimosDigitos) {
        return switch (ultimosDigitos) {
            case "0002" -> "Tarjeta rechazada por el banco emisor";
            case "9995" -> "Fondos insuficientes";
            case "0069" -> "Tarjeta vencida";
            default -> null;
        };
    }

    public PagoResponse obtener(Long id, String usuarioId, boolean privilegiado) {
        Pago pago = repository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe el pago con id " + id));
        exigirPropio(pedidoClient.obtenerPedido(pago.getPedidoId()), usuarioId, privilegiado);
        return aRespuesta(pago);
    }

    /** Los pagos de un pedido, el más reciente primero (los rechazados también se ven: son los intentos). */
    public List<PagoResponse> listarPorPedido(Long pedidoId, String usuarioId, boolean privilegiado) {
        exigirPropio(pedidoClient.obtenerPedido(pedidoId), usuarioId, privilegiado);
        return repository.findByPedidoId(pedidoId).stream()
                .sorted(Comparator.comparing(Pago::getFecha).thenComparing(Pago::getId).reversed())
                .map(this::aRespuesta).toList();
    }

    /** Un cliente solo puede pagar y ver los pagos de SUS pedidos. */
    private void exigirPropio(PedidoCliente pedido, String usuarioId, boolean privilegiado) {
        if (!privilegiado && !String.valueOf(pedido.usuarioId()).equals(usuarioId)) {
            throw new ProhibidoException("No tienes permiso para acceder a este pedido");
        }
    }

    private PagoResponse aRespuesta(Pago p) {
        return new PagoResponse(p.getId(), p.getPedidoId(), p.getMonto(), p.getMetodo(), p.getEstado(),
                p.getFecha(), p.getCodigoTransaccion(), p.getUltimosDigitos(), p.getMotivoRechazo());
    }
}
