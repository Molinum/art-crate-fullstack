package cl.artcrate.pedidos.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import cl.artcrate.pedidos.client.CarritoCliente;
import cl.artcrate.pedidos.client.CarritoClient;
import cl.artcrate.pedidos.client.InventarioClient;
import cl.artcrate.pedidos.client.ItemCarritoCliente;
import cl.artcrate.pedidos.client.ItemStockCliente;
import cl.artcrate.pedidos.dto.CrearPedidoRequest;
import cl.artcrate.pedidos.dto.PedidoResponse;
import cl.artcrate.pedidos.exception.ConflictoException;
import cl.artcrate.pedidos.exception.RecursoNoEncontradoException;
import cl.artcrate.pedidos.exception.SolicitudInvalidaException;
import cl.artcrate.pedidos.model.EstadoPedido;
import cl.artcrate.pedidos.model.ItemPedido;
import cl.artcrate.pedidos.model.Pedido;
import cl.artcrate.pedidos.repository.PedidoRepository;
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
class PedidoServiceTest {

    @Mock PedidoRepository repository;
    @Mock CarritoClient carritoClient;
    @Mock InventarioClient inventarioClient;
    PedidoService service;

    final CrearPedidoRequest datos = new CrearPedidoRequest(2L, " Av. Siempre Viva 742 ", "Santiago", "Metropolitana de Santiago");

    @BeforeEach
    void iniciar() {
        service = new PedidoService(repository, carritoClient, inventarioClient);
    }

    private CarritoCliente carrito(ItemCarritoCliente... items) {
        return new CarritoCliente(1L, 2L, List.of(items), 0);
    }

    private Pedido pedidoEn(EstadoPedido estado) {
        Pedido p = new Pedido();
        p.setId(10L);
        p.setUsuarioId(2L);
        p.setFecha(LocalDateTime.now());
        p.setEstado(estado);
        ItemPedido item = new ItemPedido();
        item.setPedido(p);
        item.setProductoId(3L);
        item.setNombre("Acuarela");
        item.setPrecioUnitario(1000);
        item.setCantidad(2);
        item.setSubtotal(2000);
        p.getItems().add(item);
        return p;
    }

    // ----- crear -----

    @Test
    @DisplayName("crear con el carrito vacío es una solicitud inválida y no toca el stock")
    void carritoVacio() {
        when(carritoClient.obtenerCarrito(2L)).thenReturn(carrito());

        assertThrows(SolicitudInvalidaException.class, () -> service.crear(datos));

        verify(inventarioClient, never()).descontar(anyList());
        verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("crear descuenta el stock, guarda el pedido pendiente de pago y vacía el carrito")
    void creaPedido() {
        when(carritoClient.obtenerCarrito(2L)).thenReturn(carrito(
                new ItemCarritoCliente(3L, "Acuarela", 1000, 2, 2000),
                new ItemCarritoCliente(4L, "Pincel", 500, 1, 500)));
        when(repository.save(any(Pedido.class))).thenAnswer(i -> i.getArgument(0));

        PedidoResponse r = service.crear(datos);

        assertEquals(EstadoPedido.PENDIENTE_PAGO, r.estado());
        assertEquals(2500, r.total());
        assertEquals("Av. Siempre Viva 742", r.direccionDespacho(), "la dirección se guarda sin espacios sobrantes");
        verify(inventarioClient).descontar(List.of(new ItemStockCliente(3L, 2), new ItemStockCliente(4L, 1)));
        verify(carritoClient).vaciarCarrito(2L);
    }

    @Test
    @DisplayName("el total se calcula con precio x cantidad, sin confiar en el subtotal del carrito")
    void recalculaElTotal() {
        when(carritoClient.obtenerCarrito(2L)).thenReturn(carrito(new ItemCarritoCliente(3L, "Acuarela", 1000, 2, 1))); // subtotal adulterado
        when(repository.save(any(Pedido.class))).thenAnswer(i -> i.getArgument(0));

        assertEquals(2000, service.crear(datos).total());
    }

    @Test
    @DisplayName("si no hay stock, no se guarda el pedido ni se vacía el carrito")
    void sinStock() {
        when(carritoClient.obtenerCarrito(2L)).thenReturn(carrito(new ItemCarritoCliente(3L, "Acuarela", 1000, 2, 2000)));
        doThrow(new ConflictoException("Stock insuficiente")).when(inventarioClient).descontar(anyList());

        assertThrows(ConflictoException.class, () -> service.crear(datos));

        verify(repository, never()).save(any());
        verify(carritoClient, never()).vaciarCarrito(anyLong());
    }

    @Test
    @DisplayName("si no se puede vaciar el carrito, se deshace el pedido y se devuelve el stock")
    void falloAlVaciarElCarrito() {
        when(carritoClient.obtenerCarrito(2L)).thenReturn(carrito(new ItemCarritoCliente(3L, "Acuarela", 1000, 2, 2000)));
        when(repository.save(any(Pedido.class))).thenAnswer(i -> i.getArgument(0));
        doThrow(new IllegalStateException("carrito caído")).when(carritoClient).vaciarCarrito(2L);

        assertThrows(IllegalStateException.class, () -> service.crear(datos));

        verify(repository).delete(any(Pedido.class));
        verify(inventarioClient).reponer(List.of(new ItemStockCliente(3L, 2)));
    }

    // ----- estados -----

    @ParameterizedTest(name = "{0} -> {1} está permitido")
    @CsvSource({"PENDIENTE_PAGO,PAGADO", "PAGADO,ENVIADO", "ENVIADO,ENTREGADO"})
    @DisplayName("el pedido avanza paso a paso")
    void avanza(EstadoPedido desde, EstadoPedido hacia) {
        when(repository.buscarParaActualizar(10L)).thenReturn(Optional.of(pedidoEn(desde)));
        when(repository.save(any(Pedido.class))).thenAnswer(i -> i.getArgument(0));

        assertEquals(hacia, service.cambiarEstado(10L, hacia).estado());
    }

    @ParameterizedTest(name = "{0} -> {1} no está permitido")
    @CsvSource({
        "PENDIENTE_PAGO,ENVIADO", "PENDIENTE_PAGO,ENTREGADO", "PAGADO,ENTREGADO", "PAGADO,PENDIENTE_PAGO",
        "ENVIADO,PAGADO", "ENTREGADO,ENVIADO", "ENTREGADO,CANCELADO", "CANCELADO,PAGADO", "CANCELADO,PENDIENTE_PAGO",
        "PAGADO,CANCELADO", "ENVIADO,CANCELADO"})
    @DisplayName("no se puede saltar ni retroceder en el flujo, ni cancelar un pedido ya pagado")
    void noPermitido(EstadoPedido desde, EstadoPedido hacia) {
        when(repository.buscarParaActualizar(10L)).thenReturn(Optional.of(pedidoEn(desde)));

        assertThrows(ConflictoException.class, () -> service.cambiarEstado(10L, hacia));

        verify(repository, never()).save(any());
        verify(inventarioClient, never()).reponer(anyList());
    }

    @Test
    @DisplayName("cancelar un pedido pendiente devuelve su stock al inventario")
    void cancelaYRepone() {
        when(repository.buscarParaActualizar(10L)).thenReturn(Optional.of(pedidoEn(EstadoPedido.PENDIENTE_PAGO)));
        when(repository.save(any(Pedido.class))).thenAnswer(i -> i.getArgument(0));

        assertEquals(EstadoPedido.CANCELADO, service.cambiarEstado(10L, EstadoPedido.CANCELADO).estado());

        verify(inventarioClient).reponer(List.of(new ItemStockCliente(3L, 2)));
    }

    @Test
    @DisplayName("si inventario no responde al cancelar, el pedido NO cambia de estado")
    void cancelarFallaInventario() {
        Pedido p = pedidoEn(EstadoPedido.PENDIENTE_PAGO);
        when(repository.buscarParaActualizar(10L)).thenReturn(Optional.of(p));
        doThrow(new IllegalStateException("inventario caído")).when(inventarioClient).reponer(anyList());

        assertThrows(IllegalStateException.class, () -> service.cambiarEstado(10L, EstadoPedido.CANCELADO));

        assertEquals(EstadoPedido.PENDIENTE_PAGO, p.getEstado());
        verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("cambiar el estado de un pedido inexistente responde no encontrado")
    void pedidoInexistente() {
        when(repository.buscarParaActualizar(99L)).thenReturn(Optional.empty());
        assertThrows(RecursoNoEncontradoException.class, () -> service.cambiarEstado(99L, EstadoPedido.PAGADO));
    }
}
