package cl.artcrate.catalogo.service;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import cl.artcrate.catalogo.dto.CategoriaRequest;
import cl.artcrate.catalogo.exception.ConflictoException;
import cl.artcrate.catalogo.exception.RecursoNoEncontradoException;
import cl.artcrate.catalogo.model.Categoria;
import cl.artcrate.catalogo.model.Producto;
import cl.artcrate.catalogo.repository.CategoriaRepository;
import cl.artcrate.catalogo.repository.ProductoRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CatalogoServiceTest {

    @Mock ProductoRepository productoRepository;
    @Mock CategoriaRepository categoriaRepository;
    ProductoService productos;
    CategoriaService categorias;

    @BeforeEach
    void iniciar() {
        productos = new ProductoService(productoRepository, categoriaRepository);
        categorias = new CategoriaService(categoriaRepository, productoRepository);
    }

    @Test
    @DisplayName("los productos no se eliminan (están en el historial de pedidos): responde conflicto y no borra")
    void productoNoSeElimina() {
        when(productoRepository.findById(1L)).thenReturn(Optional.of(new Producto()));

        assertThrows(ConflictoException.class, () -> productos.eliminar(1L));

        verify(productoRepository, never()).delete(any());
        verify(productoRepository, never()).deleteById(any());
    }

    @Test
    @DisplayName("eliminar un producto inexistente responde no encontrado")
    void productoInexistente() {
        when(productoRepository.findById(99L)).thenReturn(Optional.empty());
        assertThrows(RecursoNoEncontradoException.class, () -> productos.eliminar(99L));
    }

    @Test
    @DisplayName("una categoría con productos no se puede eliminar")
    void categoriaConProductos() {
        when(categoriaRepository.findById(1L)).thenReturn(Optional.of(new Categoria()));
        when(productoRepository.existsByCategoriaId(1L)).thenReturn(true);

        assertThrows(ConflictoException.class, () -> categorias.eliminar(1L));

        verify(categoriaRepository, never()).delete(any());
    }

    @Test
    @DisplayName("una categoría vacía sí se puede eliminar")
    void categoriaVacia() {
        Categoria c = new Categoria();
        when(categoriaRepository.findById(2L)).thenReturn(Optional.of(c));
        when(productoRepository.existsByCategoriaId(2L)).thenReturn(false);

        categorias.eliminar(2L);

        verify(categoriaRepository).delete(c);
    }

    @Test
    @DisplayName("no se crean dos categorías con el mismo nombre")
    void categoriaDuplicada() {
        when(categoriaRepository.existsByNombre("Pinturas")).thenReturn(true);

        assertThrows(ConflictoException.class, () -> categorias.crear(new CategoriaRequest(" Pinturas ", "")));

        verify(categoriaRepository, never()).save(any());
    }
}
