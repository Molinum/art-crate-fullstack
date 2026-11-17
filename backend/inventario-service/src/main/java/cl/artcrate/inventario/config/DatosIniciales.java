package cl.artcrate.inventario.config;

import cl.artcrate.inventario.model.Stock;
import cl.artcrate.inventario.repository.StockRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Carga el stock de los productos 1..30 del catálogo al arrancar. Solo crea los que aún no tienen stock. */
@Configuration
public class DatosIniciales {

    @Bean
    CommandLineRunner cargarStock(StockRepository repository) {
        return args -> {
            // Posición en el arreglo = id del producto - 1
            int[] cantidades = {
                    25, 14, 8, 40, 30, 15, 32, 22, 18, 20, 6, 10,
                    18, 22, 16, 30, 28, 12, 45, 20, 25, 18, 14, 10, 35, 26, 18, 9, 7, 5};
            for (int i = 0; i < cantidades.length; i++) {
                long productoId = i + 1;
                if (!repository.existsById(productoId)) {
                    repository.save(new Stock(productoId, cantidades[i]));
                }
            }
        };
    }
}
