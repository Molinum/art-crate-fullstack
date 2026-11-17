package cl.artcrate.catalogo.dto;

public record ProductoResponse(
        Long id,
        String sku,
        String nombre,
        String descripcion,
        long precio,
        String imagenUrl,
        String marca,
        String formato,
        String contenido,
        Long categoriaId,
        String categoriaNombre,
        boolean activo) {
}
