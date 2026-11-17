package cl.artcrate.catalogo.repository;

import cl.artcrate.catalogo.model.Producto;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductoRepository extends JpaRepository<Producto, Long> {

    // Spring Data arma las consultas a partir del nombre del método
    List<Producto> findByCategoriaId(Long categoriaId);

    boolean existsBySku(String sku);

    Optional<Producto> findBySku(String sku);

    boolean existsByCategoriaId(Long categoriaId);
}
