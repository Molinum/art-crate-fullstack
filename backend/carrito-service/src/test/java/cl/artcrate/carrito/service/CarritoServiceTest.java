package cl.artcrate.carrito.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import cl.artcrate.carrito.client.CatalogoClient;
import cl.artcrate.carrito.client.InventarioClient;
import cl.artcrate.carrito.client.ProductoCliente;
import cl.artcrate.carrito.client.StockCliente;
import cl.artcrate.carrito.dto.AgregarItemRequest;
import cl.artcrate.carrito.dto.CarritoResponse;
import cl.artcrate.carrito.exception.ConflictoException;
import cl.artcrate.carrito.exception.RecursoNoEncontradoException;
import cl.artcrate.carrito.model.Carrito;
import cl.artcrate.carrito.model.ItemCarrito;
import cl.artcrate.carrito.repository.CarritoRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CarritoServiceTest {

    @Mock CarritoRepository repository;
    @Mock CatalogoClient catalogoClient;
    @Mock InventarioClient inventarioClient;
    CarritoService service;

    @BeforeEach
    void iniciar() {
        service = new CarritoService(repository, catalogoClient, inventarioClient);
    }

    private void guardarDevuelveLoMismo() {
        when(repository.save(any(Carrito.class))).thenAnswer(i -> i.getArgument(0));
    }

    private Carrito carritoDe(long usuarioId, ItemCarrito... items) {
        Carrito c = new Carrito();
        c.setId(1L);
        c.setUsuarioId(usuarioId);
        for (ItemCarrito i : items) {
            i.setCarrito(c);
            c.getItems().add(i);
        }
        return c;
    }

    private ItemCarrito item(long productoId, String nombre, long precio, int cantidad) {
        ItemCarrito i = new ItemCarrito();
        i.setProductoId(productoId);
        i.setNombre(nombre);
        i.setPrecioUnitario(precio);
        i.setCantidad(cantidad);
        return i;
    }

    private void producto(long id, String nombre, long precio, boolean activo, int stock) {
        when(catalogoClient.obtenerProducto(id)).thenReturn(new ProductoCliente(id, nombre, precio, "assets/img/x.svg", activo));
        if (activo) when(inventarioClient.obtenerStock(id)).thenReturn(new StockCliente(id, stock));
    }

    // ----- obtener -----

    @Test
    @DisplayName("obtener crea un carrito vacío si el usuario aún no tenía")
    void creaCarritoVacio() {
        when(repository.findByUsuarioId(2L)).thenReturn(Optional.empty());
        guardarDevuelveLoMismo();

        CarritoResponse r = service.obtener(2L);

        assertEquals(2L, r.usuarioId());
        assertTrue(r.items().isEmpty());
        assertEquals(0, r.total());
    }

    @Test
    @DisplayName("el total es la suma de precio x cantidad de cada producto")
    void totalCalculado() {
        when(repository.findByUsuarioId(2L)).thenReturn(Optional.of(carritoDe(2L,
                item(1L, "Acrílico", 12990, 2), item(2L, "Pincel", 3000, 3))));

        CarritoResponse r = service.obtener(2L);

        assertEquals(25980 + 9000, r.total());
        assertEquals(25980, r.items().get(0).subtotal());
    }

    // ----- agregar -----

    @Test
    @DisplayName("agregar un producto nuevo copia nombre, precio e imagen desde el catálogo")
    void agregaNuevo() {
        when(repository.findByUsuarioId(2L)).thenReturn(Optional.of(carritoDe(2L)));
        producto(1L, "Acrílico", 12990, true, 10);
        guardarDevuelveLoMismo();

        CarritoResponse r = service.agregar(2L, new AgregarItemRequest(1L, 2));

        assertEquals(1, r.items().size());
        assertEquals("Acrílico", r.items().get(0).nombre());
        assertEquals(12990, r.items().get(0).precioUnitario());
        assertEquals(2, r.items().get(0).cantidad());
        assertEquals(25980, r.total());
    }

    @Test
    @DisplayName("agregar un producto que ya está en el carrito suma las cantidades")
    void sumaCantidades() {
        when(repository.findByUsuarioId(2L)).thenReturn(Optional.of(carritoDe(2L, item(1L, "Acrílico", 12990, 2))));
        producto(1L, "Acrílico", 12990, true, 10);
        guardarDevuelveLoMismo();

        CarritoResponse r = service.agregar(2L, new AgregarItemRequest(1L, 3));

        assertEquals(1, r.items().size(), "no se duplica la línea");
        assertEquals(5, r.items().get(0).cantidad());
    }

    @Test
    @DisplayName("se puede agregar justo hasta el stock disponible")
    void hastaElStock() {
        when(repository.findByUsuarioId(2L)).thenReturn(Optional.of(carritoDe(2L)));
        producto(1L, "Acrílico", 12990, true, 4);
        guardarDevuelveLoMismo();

        assertEquals(4, service.agregar(2L, new AgregarItemRequest(1L, 4)).items().get(0).cantidad());
    }

    @Test
    @DisplayName("no se puede agregar más de lo que hay en stock")
    void superaElStock() {
        when(repository.findByUsuarioId(2L)).thenReturn(Optional.of(carritoDe(2L)));
        producto(1L, "Acrílico", 12990, true, 3);

        ConflictoException ex = assertThrows(ConflictoException.class, () -> service.agregar(2L, new AgregarItemRequest(1L, 4)));

        assertTrue(ex.getMessage().contains("Disponible: 3"), ex.getMessage());
        verify(repository, never()).save(any(Carrito.class));
    }

    @Test
    @DisplayName("el stock cuenta lo que ya hay en el carrito: 2 en el carrito + 2 nuevos con stock 3 no alcanza")
    void superaElStockConLoQueYaHay() {
        when(repository.findByUsuarioId(2L)).thenReturn(Optional.of(carritoDe(2L, item(1L, "Acrílico", 12990, 2))));
        producto(1L, "Acrílico", 12990, true, 3);

        ConflictoException ex = assertThrows(ConflictoException.class, () -> service.agregar(2L, new AgregarItemRequest(1L, 2)));

        assertTrue(ex.getMessage().contains("ya tienes 2"), ex.getMessage());
    }

    @Test
    @DisplayName("un producto desactivado no se puede agregar y ni siquiera se consulta su stock")
    void productoInactivo() {
        producto(1L, "Acrílico", 12990, false, 0);

        assertThrows(RecursoNoEncontradoException.class, () -> service.agregar(2L, new AgregarItemRequest(1L, 1)));

        verifyNoInteractions(inventarioClient);
        verify(repository, never()).save(any(Carrito.class));
    }

    // ----- cambiar cantidad -----

    @Test
    @DisplayName("cambiar la cantidad reemplaza el valor (no lo suma)")
    void cambiaCantidad() {
        when(repository.findByUsuarioId(2L)).thenReturn(Optional.of(carritoDe(2L, item(1L, "Acrílico", 12990, 2))));
        when(inventarioClient.obtenerStock(1L)).thenReturn(new StockCliente(1L, 10));
        guardarDevuelveLoMismo();

        CarritoResponse r = service.cambiarCantidad(2L, 1L, 5);

        assertEquals(5, r.items().get(0).cantidad());
        assertEquals(64950, r.total());
    }

    @Test
    @DisplayName("cambiar la cantidad por encima del stock responde conflicto y no cambia nada")
    void cambiaSuperaStock() {
        ItemCarrito existente = item(1L, "Acrílico", 12990, 2);
        when(repository.findByUsuarioId(2L)).thenReturn(Optional.of(carritoDe(2L, existente)));
        when(inventarioClient.obtenerStock(1L)).thenReturn(new StockCliente(1L, 4));

        assertThrows(ConflictoException.class, () -> service.cambiarCantidad(2L, 1L, 5));

        assertEquals(2, existente.getCantidad());
        verify(repository, never()).save(any(Carrito.class));
    }

    @Test
    @DisplayName("cambiar la cantidad de un producto que no está en el carrito responde no encontrado")
    void cambiaInexistente() {
        when(repository.findByUsuarioId(2L)).thenReturn(Optional.of(carritoDe(2L)));
        assertThrows(RecursoNoEncontradoException.class, () -> service.cambiarCantidad(2L, 1L, 3));
    }

    @Test
    @DisplayName("cambiar la cantidad sin tener carrito responde no encontrado")
    void cambiaSinCarrito() {
        when(repository.findByUsuarioId(2L)).thenReturn(Optional.empty());
        assertThrows(RecursoNoEncontradoException.class, () -> service.cambiarCantidad(2L, 1L, 3));
    }

    // ----- quitar y vaciar -----

    @Test
    @DisplayName("quitar un producto lo saca del carrito y deja los demás")
    void quita() {
        Carrito c = carritoDe(2L, item(1L, "Acrílico", 12990, 2), item(2L, "Pincel", 3000, 1));
        when(repository.findByUsuarioId(2L)).thenReturn(Optional.of(c));

        service.quitarItem(2L, 1L);

        assertEquals(1, c.getItems().size());
        assertEquals(2L, c.getItems().get(0).getProductoId());
        verify(repository).save(c);
    }

    @Test
    @DisplayName("quitar un producto que no está responde no encontrado")
    void quitaInexistente() {
        when(repository.findByUsuarioId(2L)).thenReturn(Optional.of(carritoDe(2L, item(2L, "Pincel", 3000, 1))));
        assertThrows(RecursoNoEncontradoException.class, () -> service.quitarItem(2L, 1L));
    }

    @Test
    @DisplayName("vaciar deja el carrito sin productos")
    void vacia() {
        Carrito c = carritoDe(2L, item(1L, "Acrílico", 12990, 2), item(2L, "Pincel", 3000, 1));
        when(repository.findByUsuarioId(2L)).thenReturn(Optional.of(c));

        service.vaciar(2L);

        assertTrue(c.getItems().isEmpty());
        verify(repository).save(c);
    }

    @Test
    @DisplayName("vaciar el carrito de alguien que no tiene no falla ni crea nada")
    void vaciaSinCarrito() {
        when(repository.findByUsuarioId(2L)).thenReturn(Optional.empty());

        service.vaciar(2L);

        verify(repository, never()).save(any(Carrito.class));
    }
}
