package cl.artcrate.catalogo.config;

import cl.artcrate.catalogo.model.Categoria;
import cl.artcrate.catalogo.model.Producto;
import cl.artcrate.catalogo.repository.CategoriaRepository;
import cl.artcrate.catalogo.repository.ProductoRepository;
import java.util.List;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.Sort;

/**
 * Carga 5 categorías y 48 productos al arrancar.
 * - Si las tablas están vacías, crea todo en orden (los productos quedan con ids 1..48; el inventario depende de eso).
 * - Los productos sin foto (todavía con el dibujo .svg) quedan desactivados.
 * - Si ya había datos, solo agrega los productos que falten (por SKU) y completa la ficha técnica de los que no la tenían.
 */
@Configuration
public class DatosIniciales {

    /** Un producto de ejemplo. "categoria" es la posición de la categoría (0 = Pintura ... 4 = Kits). */
    private record Semilla(String sku, String nombre, String descripcion, long precio, String imagen,
            int categoria, String marca, String formato, String contenido) {
    }

    // El orden importa: la posición en la lista es el id del producto (1..30)
    private static final List<Semilla> PRODUCTOS = List.of(
            // ----- Pintura -----
            new Semilla("ART-PIN-001", "Acrílico 12 colores",
                    "Set de 12 tubos de pintura acrílica de 22 ml, secado rápido y colores intensos.",
                    12990, "assets/img/producto-01-acrilico-12-colores.svg", 0, "Pigmenta", "Tubos de 22 ml", "12 colores"),
            new Semilla("ART-PIN-002", "Óleo 6 tubos",
                    "Seis tubos de pintura al óleo de 20 ml con gran poder cubriente.",
                    18990, "assets/img/producto-02-oleo-6-tubos.svg", 0, "Pigmenta", "Tubos de 20 ml", "6 colores"),
            new Semilla("ART-PIN-003", "Acuarela 24 pastillas",
                    "Caja metálica de acuarela profesional con 24 pastillas y pincel.",
                    24990, "assets/img/producto-03-acuarela-24-pastillas.svg", 0, "Atelier Sur", "Caja metálica", "24 pastillas y 1 pincel"),
            // ----- Dibujo -----
            new Semilla("ART-DIB-001", "Lápices grafito x12",
                    "Set de 12 lápices de grafito de distintas durezas (de 6B a 4H).",
                    7990, "assets/img/producto-04-lapices-grafito-12.svg", 1, "Trazo Fino", "Estuche de cartón", "12 lápices (6B a 4H)"),
            new Semilla("ART-DIB-002", "Carboncillo y difuminos",
                    "Barras de carboncillo natural con difuminos de papel para sombreado.",
                    5990, "assets/img/producto-05-carboncillo-difuminos.svg", 1, "Trazo Fino", "Caja de cartón", "Barras de carboncillo y difuminos de papel"),
            new Semilla("ART-DIB-003", "Marcadores x24",
                    "Estuche de 24 marcadores de doble punta, fina y gruesa.",
                    16990, "assets/img/producto-06-marcadores-24.svg", 1, "Colorín", "Estuche, doble punta", "24 marcadores"),
            // ----- Papeles y lienzos -----
            new Semilla("ART-PAP-001", "Lienzo 40x50 cm",
                    "Lienzo de algodón imprimado de 40 por 50 centímetros, listo para pintar.",
                    8990, "assets/img/producto-07-lienzo-40x50.svg", 2, "Lienzo Sur", "40 x 50 cm", "1 lienzo"),
            new Semilla("ART-PAP-002", "Block acuarela A4",
                    "Block de 20 hojas de papel para acuarela de 300 gramos, tamaño A4.",
                    9990, "assets/img/producto-08-block-acuarela-a4.svg", 2, "Boceto", "A4, 300 g", "20 hojas"),
            new Semilla("ART-PAP-003", "Cuaderno de bocetos A5",
                    "Cuaderno de bocetos de tapa dura, 80 hojas de 140 g, tamaño 13 x 21 cm.",
                    6490, "assets/img/productos/sakura-sketchbook-13x21.webp", 2, "Sakura", "13 x 21 cm, tapa dura", "80 hojas"),
            // ----- Pinceles y accesorios -----
            new Semilla("ART-ACC-001", "Set de 5 pinceles",
                    "Cinco pinceles sintéticos de distintas formas y tamaños.",
                    7490, "assets/img/producto-10-set-pinceles-5.svg", 3, "Atelier Sur", "Pinceles sintéticos", "5 pinceles"),
            new Semilla("ART-ACC-002", "Caballete de mesa",
                    "Caballete de mesa de madera plegable, ideal para espacios pequeños.",
                    21990, "assets/img/producto-11-caballete-mesa.svg", 3, "Lienzo Sur", "Madera plegable", "1 caballete"),
            // ----- Kits -----
            new Semilla("ART-KIT-001", "Kit Iniciación Acrílico",
                    "Kit ArtCrate con pinturas acrílicas, pinceles, lienzo y paleta para empezar.",
                    29990, "assets/img/producto-12-kit-iniciacion-acrilico.svg", 4, "ArtCrate", "Caja kit", "Pinturas acrílicas, pinceles, lienzo y paleta"),

            // ===== Productos nuevos (13 al 30) =====
            new Semilla("ART-PIN-004", "Acrílico metálico x6",
                    "Set de 6 acrílicos Liquitex Basics con acabado metálico, ideal para detalles y decoración.",
                    14990, "assets/img/productos/liquitex-basics-metalicos-x6.avif", 0, "Liquitex", "Set Basics", "6 colores metálicos"),
            new Semilla("ART-PIN-005", "Gouache 12 colores",
                    "Témpera gouache opaca de secado mate, ideal para ilustración y diseño.",
                    15990, "assets/img/producto-14-gouache-12-colores.svg", 0, "Atelier Sur", "Tubos de 15 ml", "12 colores"),
            new Semilla("ART-PIN-006", "Acuarela líquida x8",
                    "Ocho frascos de acuarela líquida de alta intensidad, con gotario.",
                    13490, "assets/img/producto-15-acuarela-liquida-x8.svg", 0, "Colorín", "Frascos de 30 ml", "8 colores"),
            new Semilla("ART-PIN-007", "Barniz acrílico brillante",
                    "Barniz protector de acabado brillante para obras en acrílico y óleo.",
                    8490, "assets/img/producto-16-barniz-acrilico-brillante.svg", 0, "Pigmenta", "Botella de 250 ml", "1 botella"),
            new Semilla("ART-DIB-004", "Lápices de colores x24",
                    "Estuche de 24 lápices de colores de mina blanda y pigmentos vivos.",
                    9990, "assets/img/producto-17-lapices-colores-24.svg", 1, "Trazo Fino", "Estuche metálico", "24 lápices"),
            new Semilla("ART-DIB-005", "Pastel seco x24",
                    "Barras de pastel seco suave para trabajos de gran intensidad de color.",
                    14490, "assets/img/producto-18-pastel-seco-x24.svg", 1, "Atelier Sur", "Caja de cartón", "24 barras"),
            new Semilla("ART-DIB-006", "Portaminas técnico 0.5",
                    "Portaminas Staedtler Mars micro de 0,5 mm con zona de agarre antideslizante.",
                    5490, "assets/img/productos/staedtler-mars-micro-05.webp", 1, "Staedtler", "Portaminas de 0,5 mm", "1 portaminas"),
            new Semilla("ART-DIB-007", "Tintas chinas x6",
                    "Seis tintas chinas, negras y de color, con cuentagotas para línea y lavado.",
                    11990, "assets/img/producto-20-tintas-chinas-x6.svg", 1, "Colorín", "Frascos de 20 ml", "6 frascos"),
            new Semilla("ART-PAP-004", "Lienzo 30x40 cm",
                    "Lienzo de algodón imprimado de 30 por 40 centímetros, listo para pintar.",
                    6990, "assets/img/producto-21-lienzo-30x40.svg", 2, "Lienzo Sur", "30 x 40 cm", "1 lienzo"),
            new Semilla("ART-PAP-005", "Lienzo 50x70 cm",
                    "Lienzo de algodón imprimado de 50 por 70 centímetros para obras de mayor tamaño.",
                    12490, "assets/img/producto-22-lienzo-50x70.svg", 2, "Lienzo Sur", "50 x 70 cm", "1 lienzo"),
            new Semilla("ART-PAP-006", "Block de dibujo A3",
                    "Block de 30 hojas de papel de 160 gramos para técnicas secas.",
                    8990, "assets/img/producto-23-block-dibujo-a3.svg", 2, "Boceto", "A3 (297 x 420 mm)", "30 hojas de 160 g"),
            new Semilla("ART-PAP-007", "Papel kraft en rollo",
                    "Rollo de papel kraft para bocetos grandes, collage y embalaje creativo.",
                    5990, "assets/img/producto-24-papel-kraft-rollo.svg", 2, "Boceto", "Rollo de 5 m x 60 cm", "1 rollo"),
            new Semilla("ART-ACC-003", "Paleta de mezcla",
                    "Paleta ovalada de plástico rígido con pocillo para mezclar colores.",
                    3990, "assets/img/producto-25-paleta-de-mezcla.svg", 3, "Atelier Sur", "Paleta de 30 cm", "1 paleta"),
            new Semilla("ART-ACC-004", "Espátulas x5",
                    "Cinco espátulas de metal con mango negro para óleo y acrílico.",
                    9490, "assets/img/productos/royal-langnickel-espatulas-x5.jpg", 3, "Royal & Langnickel", "Metal y mango negro", "5 espátulas"),
            new Semilla("ART-ACC-005", "Atril de pie plegable",
                    "Atril de pino de pie, regulable en altura y plegable.",
                    34990, "assets/img/producto-27-atril-de-pie.svg", 3, "Lienzo Sur", "Altura regulable hasta 170 cm", "1 atril"),
            new Semilla("ART-KIT-002", "Kit Acuarela Viajero",
                    "Kit portátil con acuarelas, pinceles, block y paleta para pintar en cualquier lugar.",
                    27990, "assets/img/producto-28-kit-acuarela-viajero.svg", 4, "ArtCrate", "Estuche de viaje", "12 pastillas, 2 pinceles y block A5"),
            new Semilla("ART-KIT-003", "Kit Dibujo Profesional",
                    "Kit con lápices de grafito, carboncillo, difuminos y cuaderno de bocetos.",
                    32990, "assets/img/producto-29-kit-dibujo-profesional.svg", 4, "ArtCrate", "Caja de madera", "12 lápices, carboncillo, difuminos y cuaderno A5"),
            new Semilla("ART-KIT-004", "Kit Óleo Principiante",
                    "Kit con tubos de óleo, pinceles, lienzo y medium para dar los primeros pasos.",
                    36990, "assets/img/producto-30-kit-oleo-principiante.svg", 4, "ArtCrate", "Caja de madera", "6 tubos, 3 pinceles, lienzo 30x40 y medium"),

            // ===== Productos con foto (31 al 48) =====
            new Semilla("ART-PIN-008", "Óleo Winton 10 tubos",
                    "Set de óleos Winsor & Newton Winton con diez colores para empezar a pintar.",
                    44990, "assets/img/productos/winsor-newton-winton-10.webp", 0, "Winsor & Newton", "Tubos de 12 ml", "10 colores"),
            new Semilla("ART-PIN-009", "Acrílicos metálicos e iridiscentes x6",
                    "Set Liquitex Basics con bronce, cobre, plata, oro, blanco y grafito iridiscentes.",
                    54990, "assets/img/productos/liquitex-basics-iridiscentes-x6.avif", 0, "Liquitex", "Set Basics", "6 colores"),
            new Semilla("ART-DIB-008", "Lápices grafito Winsor & Newton x6",
                    "Seis lápices de grafito (2H, HB, 2B, 4B, 6B y 8B).",
                    9990, "assets/img/productos/winsor-newton-grafito-6.webp", 1, "Winsor & Newton", "Estuche", "6 lápices (2H a 8B)"),
            new Semilla("ART-DIB-009", "Marcadores pincel Staedtler x36",
                    "Rotuladores acuarelables de doble punta, pincel y fina.",
                    39990, "assets/img/productos/staedtler-brush-36.webp", 1, "Staedtler", "Doble punta, acuarelables", "36 marcadores"),
            new Semilla("ART-DIB-010", "Portaminas Staedtler Mars technico 2 mm",
                    "Portaminas de dibujo técnico para minas de 2 mm, con indicador de dureza.",
                    8990, "assets/img/productos/staedtler-mars-technico-2mm.jpg", 1, "Staedtler", "Mina de 2 mm", "1 portaminas"),
            new Semilla("ART-DIB-011", "Lápices de colores Winsor & Newton x12",
                    "Doce lápices de colores Studio Collection con caja metálica.",
                    14990, "assets/img/productos/winsor-newton-colores-12.webp", 1, "Winsor & Newton", "Caja metálica", "12 lápices"),
            new Semilla("ART-DIB-012", "Lápices pastel Pitt x24",
                    "Lápices pastel Faber-Castell Pitt en caja metálica.",
                    64990, "assets/img/productos/faber-castell-pitt-pastel-24.jpg", 1, "Faber-Castell", "Caja metálica", "24 lápices"),
            new Semilla("ART-DIB-013", "Tinta Sketchink Klara 50 ml",
                    "Tinta verde Rohrer & Klingner para bocetos a línea y aguadas.",
                    12990, "assets/img/productos/rohrer-klingner-sketchink-klara.webp", 1, "Rohrer & Klingner", "Frasco de 50 ml", "1 frasco"),
            new Semilla("ART-PAP-008", "Croquera Canson XL Croquis A3",
                    "Croquera anillada de papel de 90 g para bocetos.",
                    18990, "assets/img/productos/canson-xl-croquis-a3.jpg", 2, "Canson", "A3, 90 g", "120 hojas"),
            new Semilla("ART-PAP-009", "Block acuarela Canson Montval",
                    "Papel para acuarela de grano fino y 300 g.",
                    14690, "assets/img/productos/canson-montval-300.webp", 2, "Canson", "300 g, grano fino", "12 hojas"),
            new Semilla("ART-PAP-010", "Block Canson XL Mix-Media A3",
                    "Papel de 300 g para técnicas mixtas, anillado.",
                    17990, "assets/img/productos/canson-xl-mix-media-a3.webp", 2, "Canson", "A3, 300 g", "30 hojas"),
            new Semilla("ART-PAP-011", "Block de tela negra Fredrix",
                    "Hojas de tela negra imprimada, aptas para cualquier medio.",
                    12990, "assets/img/productos/fredrix-black-canvas-pad.png", 2, "Fredrix", "22,9 x 30,5 cm", "10 hojas"),
            new Semilla("ART-PAP-012", "Lienzo Fredrix Red Label 23x30",
                    "Lienzo de algodón imprimado con bastidor de perfil galería.",
                    10990, "assets/img/productos/fredrix-red-label-23x30.webp", 2, "Fredrix", "22,9 x 30,5 cm", "1 lienzo"),
            new Semilla("ART-PAP-013", "Lienzo para acuarela Fredrix 23x30",
                    "Lienzo de algodón preparado para pinturas al agua.",
                    18990, "assets/img/productos/fredrix-watercolor-23x30.jpg", 2, "Fredrix", "22,9 x 30,5 cm", "1 lienzo"),
            new Semilla("ART-PAP-014", "Lienzo redondo Fredrix 12,7 cm",
                    "Lienzo circular imprimado para acrílico y óleo.",
                    4990, "assets/img/productos/fredrix-redondo-127.jpg", 2, "Fredrix", "12,7 cm de diámetro", "1 lienzo"),
            new Semilla("ART-PAP-015", "Cuaderno Sakura hojas negras 12x12",
                    "Cuaderno de tapa dura con hojas negras de 140 g.",
                    11990, "assets/img/productos/sakura-sketchbook-negro-12x12.webp", 2, "Sakura", "12 x 12 cm, 140 g", "80 hojas"),
            new Semilla("ART-KIT-005", "Estuche acuarela Winsor & Newton Pro",
                    "Estuche de estudio en madera con acuarelas profesionales y accesorios.",
                    189990, "assets/img/productos/winsor-newton-studio-case.webp", 4, "Winsor & Newton", "Caja de madera", "20 piezas, 12 tubos"),
            new Semilla("ART-KIT-006", "Set de bolsillo acuarela Cotman",
                    "Set portátil de acuarelas Cotman con pincel y goma.",
                    49990, "assets/img/productos/winsor-newton-cotman-bolsillo.webp", 4, "Winsor & Newton", "Estuche de bolsillo", "19 piezas, 16 pastillas"));

    @Bean
    CommandLineRunner cargarCatalogo(CategoriaRepository categorias, ProductoRepository productos) {
        return args -> {
            if (categorias.count() == 0) {
                categorias.save(categoria("Pintura", "Acrílicos, óleos y acuarelas"));
                categorias.save(categoria("Dibujo", "Lápices, carboncillo y marcadores"));
                categorias.save(categoria("Papeles y lienzos", "Soportes para pintar y dibujar"));
                categorias.save(categoria("Pinceles y accesorios", "Pinceles, caballetes y complementos"));
                categorias.save(categoria("Kits ArtCrate", "Kits listos para empezar a crear"));
            }

            List<Categoria> cats = categorias.findAll(Sort.by("id")); // en orden: 1..5
            // true solo la primera vez que arranca la versión con fotos: así no se pisan cambios hechos después en el panel
            boolean pasarAFotos = productos.findBySku("ART-PIN-008").isEmpty();
            for (Semilla s : PRODUCTOS) {
                Producto existente = productos.findBySku(s.sku()).orElse(null);
                if (existente == null) {
                    productos.save(producto(s, cats.get(s.categoria())));
                } else if (existente.getMarca() == null) {
                    // producto de una versión anterior: se le agrega la ficha técnica
                    existente.setMarca(s.marca());
                    existente.setFormato(s.formato());
                    existente.setContenido(s.contenido());
                    productos.save(existente);
                }
                if (existente != null && pasarAFotos && existente.getImagenUrl().endsWith(".svg")) {
                    if (tieneFoto(s)) {
                        existente.setImagenUrl(s.imagen());
                        existente.setDescripcion(s.descripcion());
                        existente.setMarca(s.marca());
                        existente.setFormato(s.formato());
                        existente.setContenido(s.contenido());
                    } else {
                        existente.setActivo(false);
                    }
                    productos.save(existente);
                }
            }
        };
    }

    private boolean tieneFoto(Semilla s) {
        return !s.imagen().endsWith(".svg");
    }

    private Categoria categoria(String nombre, String descripcion) {
        Categoria c = new Categoria();
        c.setNombre(nombre);
        c.setDescripcion(descripcion);
        return c;
    }

    private Producto producto(Semilla s, Categoria categoria) {
        Producto p = new Producto();
        p.setSku(s.sku());
        p.setNombre(s.nombre());
        p.setDescripcion(s.descripcion());
        p.setPrecio(s.precio());
        p.setImagenUrl(s.imagen());
        p.setMarca(s.marca());
        p.setFormato(s.formato());
        p.setContenido(s.contenido());
        p.setCategoria(categoria);
        p.setActivo(tieneFoto(s));
        return p;
    }
}
