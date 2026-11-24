package cl.artcrate.pagos.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

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
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PagoServiceTest {

    @Mock PagoRepository repository;
    @Mock PedidoClient pedidoClient;
    PagoService service;

    @BeforeEach
    void iniciar() {
        service = new PagoService(repository, pedidoClient);
    }

    private void pedido(String estado) {
        when(pedidoClient.obtenerPedido(5L)).thenReturn(new PedidoCliente(5L, 2L, estado, 25980));
    }

    private void guardarDevuelveLoMismo() {
        when(repository.save(any(Pago.class))).thenAnswer(i -> i.getArgument(0));
    }

    private CrearPagoRequest tarjeta(String digitos) {
        return new CrearPagoRequest(5L, MetodoPago.TARJETA, digitos);
    }

    // ----- resultado de la simulación -----

    @Test
    @DisplayName("una tarjeta cualquiera se aprueba y el pedido pasa a PAGADO")
    void aprobada() {
        pedido("PENDIENTE_PAGO");
        guardarDevuelveLoMismo();

        PagoResponse r = service.pagar(tarjeta("4242"), "2", false);

        assertEquals(EstadoPago.APROBADO, r.estado());
        assertNull(r.motivoRechazo());
        assertEquals("4242", r.ultimosDigitos());
        verify(pedidoClient).cambiarEstado(5L, new CambiarEstadoCliente("PAGADO"));
    }

    @ParameterizedTest(name = "tarjeta terminada en {0} -> {1}")
    @CsvSource({"0002,Tarjeta rechazada por el banco emisor", "9995,Fondos insuficientes", "0069,Tarjeta vencida"})
    @DisplayName("las tarjetas de prueba se rechazan con su motivo y el pedido sigue pendiente")
    void rechazadas(String digitos, String motivo) {
        pedido("PENDIENTE_PAGO");
        guardarDevuelveLoMismo();

        PagoResponse r = service.pagar(tarjeta(digitos), "2", false);

        assertEquals(EstadoPago.RECHAZADO, r.estado());
        assertEquals(motivo, r.motivoRechazo());
        verify(pedidoClient, never()).cambiarEstado(anyLong(), any());
    }

    @Test
    @DisplayName("el monto sale del pedido, no de lo que mande el cliente")
    void montoDelPedido() {
        pedido("PENDIENTE_PAGO");
        guardarDevuelveLoMismo();

        assertEquals(25980, service.pagar(tarjeta("4242"), "2", false).monto());
    }

    @Test
    @DisplayName("la transferencia se aprueba y no guarda dígitos de tarjeta")
    void transferencia() {
        pedido("PENDIENTE_PAGO");
        guardarDevuelveLoMismo();

        PagoResponse r = service.pagar(new CrearPagoRequest(5L, MetodoPago.TRANSFERENCIA, "0002"), "2", false);

        assertEquals(EstadoPago.APROBADO, r.estado());
        assertNull(r.ultimosDigitos());
    }

    @Test
    @DisplayName("pagar con tarjeta sin los últimos dígitos es una solicitud inválida")
    void sinDigitos() {
        pedido("PENDIENTE_PAGO");
        assertThrows(SolicitudInvalidaException.class, () -> service.pagar(tarjeta(null), "2", false));
        verify(repository, never()).save(any());
    }

    // ----- reglas del pedido -----

    @ParameterizedTest(name = "pedido en estado {0}")
    @CsvSource({"PAGADO", "ENVIADO", "ENTREGADO", "CANCELADO"})
    @DisplayName("solo se paga un pedido pendiente de pago")
    void noPendiente(String estado) {
        pedido(estado);
        assertThrows(ConflictoException.class, () -> service.pagar(tarjeta("4242"), "2", false));
        verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("si no se puede marcar el pedido como pagado, el pago se borra")
    void deshaceElPago() {
        pedido("PENDIENTE_PAGO");
        guardarDevuelveLoMismo();
        doThrow(new IllegalStateException("pedidos caído")).when(pedidoClient).cambiarEstado(anyLong(), any());

        assertThrows(IllegalStateException.class, () -> service.pagar(tarjeta("4242"), "2", false));

        verify(repository).delete(any(Pago.class));
    }

    // ----- dueño del pedido -----

    @Test
    @DisplayName("un cliente no puede pagar el pedido de otro usuario")
    void pedidoAjeno() {
        pedido("PENDIENTE_PAGO");
        assertThrows(ProhibidoException.class, () -> service.pagar(tarjeta("4242"), "3", false));
        verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("un administrador o un servicio sí pueden pagar el pedido de otro")
    void privilegiado() {
        pedido("PENDIENTE_PAGO");
        guardarDevuelveLoMismo();
        assertEquals(EstadoPago.APROBADO, service.pagar(tarjeta("4242"), "1", true).estado());
    }

    @Test
    @DisplayName("un cliente no ve los pagos de un pedido ajeno")
    void listarAjeno() {
        pedido("PAGADO");
        assertThrows(ProhibidoException.class, () -> service.listarPorPedido(5L, "3", false));
    }

    @Test
    @DisplayName("los pagos de un pedido salen del más reciente al más antiguo")
    void ordenados() {
        pedido("PAGADO");
        Pago viejo = pago(1L, LocalDateTime.now().minusMinutes(5), EstadoPago.RECHAZADO);
        Pago nuevo = pago(2L, LocalDateTime.now(), EstadoPago.APROBADO);
        when(repository.findByPedidoId(5L)).thenReturn(List.of(viejo, nuevo));

        List<PagoResponse> r = service.listarPorPedido(5L, "2", false);

        assertEquals(List.of(2L, 1L), r.stream().map(PagoResponse::id).toList());
    }

    @Test
    @DisplayName("obtener un pago ajeno responde prohibido y uno inexistente, no encontrado")
    void obtener() {
        pedido("PAGADO");
        when(repository.findById(7L)).thenReturn(Optional.of(pago(7L, LocalDateTime.now(), EstadoPago.APROBADO)));
        when(repository.findById(8L)).thenReturn(Optional.empty());

        assertThrows(ProhibidoException.class, () -> service.obtener(7L, "3", false));
        assertEquals(7L, service.obtener(7L, "2", false).id());
        assertThrows(RecursoNoEncontradoException.class, () -> service.obtener(8L, "2", false));
    }

    private Pago pago(Long id, LocalDateTime fecha, EstadoPago estado) {
        Pago p = new Pago();
        p.setId(id);
        p.setPedidoId(5L);
        p.setMonto(25980);
        p.setMetodo(MetodoPago.TARJETA);
        p.setEstado(estado);
        p.setFecha(fecha);
        p.setCodigoTransaccion("cod-" + id);
        return p;
    }
}
