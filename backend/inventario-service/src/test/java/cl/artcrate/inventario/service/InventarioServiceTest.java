package cl.artcrate.inventario.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import cl.artcrate.inventario.dto.ItemStockRequest;
import cl.artcrate.inventario.dto.StockResponse;
import cl.artcrate.inventario.exception.ConflictoException;
import cl.artcrate.inventario.exception.SolicitudInvalidaException;
import cl.artcrate.inventario.model.Stock;
import cl.artcrate.inventario.repository.StockRepository;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class InventarioServiceTest {

    @Mock StockRepository repository;
    InventarioService service;

    @BeforeEach
    void iniciar() {
        service = new InventarioService(repository);
    }

    @SuppressWarnings("unchecked")
    private void guardarDevuelveLoMismo() {
        when(repository.saveAll(any())).thenAnswer(i -> new ArrayList<>((Collection<Stock>) i.getArgument(0)));
    }

    private int cantidad(List<StockResponse> r, long id) {
        return r.stream().filter(s -> s.productoId() == id).findFirst().orElseThrow().cantidad();
    }

    @Test
    @DisplayName("descontar resta la cantidad pedida de cada producto")
    void descuenta() {
        when(repository.buscarYBloquear(any())).thenReturn(List.of(new Stock(1L, 10), new Stock(2L, 5)));
        guardarDevuelveLoMismo();

        var r = service.descontar(List.of(new ItemStockRequest(1L, 3), new ItemStockRequest(2L, 5)));

        assertEquals(7, cantidad(r, 1));
        assertEquals(0, cantidad(r, 2));
    }

    @Test
    @DisplayName("descontar es todo o nada: si a un producto no le alcanza, no se descuenta ninguno")
    void todoONada() {
        Stock uno = new Stock(1L, 10);
        Stock dos = new Stock(2L, 1);
        when(repository.buscarYBloquear(any())).thenReturn(List.of(uno, dos));

        var ex = assertThrows(ConflictoException.class,
                () -> service.descontar(List.of(new ItemStockRequest(1L, 3), new ItemStockRequest(2L, 4))));

        assertEquals(10, uno.getCantidad(), "el producto con stock suficiente no debe cambiar");
        assertEquals(1, dos.getCantidad());
        verify(repository, never()).saveAll(anyCollection());
        assertEquals(true, ex.getMessage().contains("producto 2"));
    }

    @Test
    @DisplayName("descontar un producto sin stock registrado responde conflicto")
    void sinRegistro() {
        when(repository.buscarYBloquear(any())).thenReturn(List.of());
        assertThrows(ConflictoException.class, () -> service.descontar(List.of(new ItemStockRequest(9L, 1))));
    }

    @Test
    @DisplayName("descontar junta las líneas repetidas de un mismo producto")
    void agrupaRepetidos() {
        when(repository.buscarYBloquear(any())).thenReturn(List.of(new Stock(3L, 10)));
        guardarDevuelveLoMismo();

        var r = service.descontar(List.of(new ItemStockRequest(3L, 1), new ItemStockRequest(3L, 2)));

        assertEquals(7, cantidad(r, 3));
    }

    @Test
    @DisplayName("una lista vacía o una cantidad menor a 1 es una solicitud inválida")
    void solicitudInvalida() {
        assertThrows(SolicitudInvalidaException.class, () -> service.descontar(List.of()));
        assertThrows(SolicitudInvalidaException.class, () -> service.descontar(null));
        assertThrows(SolicitudInvalidaException.class, () -> service.descontar(List.of(new ItemStockRequest(1L, 0))));
        assertThrows(SolicitudInvalidaException.class, () -> service.reponer(List.of(new ItemStockRequest(1L, -2))));
    }

    @Test
    @DisplayName("reponer suma al stock y crea el registro si no existía")
    void repone() {
        when(repository.buscarYBloquear(any())).thenReturn(List.of(new Stock(1L, 4)));
        guardarDevuelveLoMismo();

        var r = service.reponer(List.of(new ItemStockRequest(1L, 6), new ItemStockRequest(8L, 2)));

        assertEquals(10, cantidad(r, 1));
        assertEquals(2, cantidad(r, 8));
    }

    @Test
    @DisplayName("fijar crea el stock si el producto aún no tenía y deja la cantidad exacta")
    void fijar() {
        when(repository.findById(5L)).thenReturn(Optional.empty());
        when(repository.save(any(Stock.class))).thenAnswer(i -> i.getArgument(0));

        assertEquals(12, service.fijar(5L, 12).cantidad());
    }
}
