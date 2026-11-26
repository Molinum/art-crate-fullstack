package cl.artcrate.gateway;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.concurrent.atomic.AtomicBoolean;
import javax.crypto.SecretKey;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.http.HttpMethod;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import reactor.core.publisher.Mono;

/** Reglas del gateway: lo primero que ve cada petición antes de llegar a un servicio. */
class FiltroJwtTest {

    private static final String SECRETO = "artcrate-clave-jwt-solo-para-desarrollo-2026";
    private final FiltroJwt filtro = new FiltroJwt(SECRETO, new ObjectMapper());

    private static String token(String secreto, String id, String rol, Instant vence) {
        SecretKey clave = Keys.hmacShaKeyFor(secreto.getBytes(StandardCharsets.UTF_8));
        return Jwts.builder().subject(id).claim("rol", rol)
                .issuedAt(Date.from(Instant.now().minusSeconds(10))).expiration(Date.from(vence))
                .signWith(clave).compact();
    }

    private static String valido(String id, String rol) {
        return token(SECRETO, id, rol, Instant.now().plusSeconds(600));
    }

    /** 200 si la petición pasó hacia el servicio; si no, el código con que la rechazó el gateway. */
    private int llamar(String metodo, String ruta, String tk) {
        var builder = MockServerHttpRequest.method(HttpMethod.valueOf(metodo), ruta);
        if (tk != null) builder.header("Authorization", "Bearer " + tk);
        MockServerWebExchange exchange = MockServerWebExchange.from(builder);
        AtomicBoolean paso = new AtomicBoolean(false);
        filtro.filter(exchange, e -> { paso.set(true); return Mono.empty(); }).block();
        return paso.get() ? 200 : exchange.getResponse().getStatusCode().value();
    }

    @ParameterizedTest(name = "{0}: {1} {2} como {3} -> {4}")
    @CsvSource(delimiter = '|', value = {
        "login es público                 | POST    | /api/usuarios/login       | -          | 200",
        "registro es público              | POST    | /api/usuarios/registro    | -          | 200",
        "catálogo es público              | GET     | /api/productos            | -          | 200",
        "categorías son públicas          | GET     | /api/categorias           | -          | 200",
        "stock es público                 | GET     | /api/inventario/3         | -          | 200",
        "swagger es público               | GET     | /docs/usuarios/v3/api-docs| -          | 200",
        "preflight CORS es público        | OPTIONS | /api/pedidos              | -          | 200",
        "listar usuarios sin token        | GET     | /api/usuarios             | -          | 401",
        "cliente no lista usuarios        | GET     | /api/usuarios             | CLIENTE:2  | 403",
        "admin lista usuarios             | GET     | /api/usuarios             | ADMIN:1    | 200",
        "cliente ve su usuario            | GET     | /api/usuarios/2           | CLIENTE:2  | 200",
        "cliente no ve otro usuario       | GET     | /api/usuarios/1           | CLIENTE:2  | 403",
        "cliente no se edita el rol       | PUT     | /api/usuarios/2           | CLIENTE:2  | 403",
        "cliente no crea productos        | POST    | /api/productos            | CLIENTE:2  | 403",
        "admin crea productos             | POST    | /api/productos            | ADMIN:1    | 200",
        "cliente no fija stock            | PUT     | /api/inventario/3         | CLIENTE:2  | 403",
        "cliente no descuenta stock       | POST    | /api/inventario/descontar | CLIENTE:2  | 403",
        "cliente ve su carrito            | GET     | /api/carritos/2           | CLIENTE:2  | 200",
        "cliente no ve carrito ajeno      | GET     | /api/carritos/1           | CLIENTE:2  | 403",
        "cliente no lista pedidos         | GET     | /api/pedidos              | CLIENTE:2  | 403",
        "cliente crea pedido              | POST    | /api/pedidos              | CLIENTE:2  | 200",
        "cliente ve sus pedidos           | GET     | /api/pedidos/usuario/2    | CLIENTE:2  | 200",
        "cliente no ve pedidos ajenos     | GET     | /api/pedidos/usuario/1    | CLIENTE:2  | 403",
        "cliente no cambia estados        | PATCH   | /api/pedidos/5/estado     | CLIENTE:2  | 403",
        "admin cambia estados             | PATCH   | /api/pedidos/5/estado     | ADMIN:1    | 200",
        "cliente paga                     | POST    | /api/pagos                | CLIENTE:2  | 200",
        "pagar sin token                  | POST    | /api/pagos                | -          | 401",
        "encargado crea productos         | POST    | /api/productos            | ENCARGADO:3| 200",
        "encargado fija stock             | PUT     | /api/inventario/3         | ENCARGADO:3| 200",
        "encargado lista pedidos          | GET     | /api/pedidos              | ENCARGADO:3| 200",
        "encargado cambia estados         | PATCH   | /api/pedidos/5/estado     | ENCARGADO:3| 200",
        "encargado consulta usuarios      | GET     | /api/usuarios             | ENCARGADO:3| 200",
        "encargado no cambia usuarios     | PUT     | /api/usuarios/2           | ENCARGADO:3| 403",
        "encargado no se cambia el rol    | PUT     | /api/usuarios/3           | ENCARGADO:3| 403",
        "encargado no ve carritos ajenos  | GET     | /api/carritos/2           | ENCARGADO:3| 403",
        "encargado ve su carrito          | GET     | /api/carritos/3           | ENCARGADO:3| 200"
    })
    @DisplayName("permisos por ruta y rol")
    void permisos(String caso, String metodo, String ruta, String quien, int esperado) {
        String tk = "-".equals(quien) ? null : valido(quien.split(":")[1], quien.split(":")[0]);
        assertEquals(esperado, llamar(metodo, ruta, tk), caso);
    }

    @Test
    @DisplayName("token firmado con otra clave -> 401")
    void otraClave() {
        String falso = token("otra-clave-distinta-de-32-caracteres-o-mas!!", "1", "ADMIN", Instant.now().plusSeconds(600));
        assertEquals(401, llamar("GET", "/api/usuarios", falso));
    }

    @Test
    @DisplayName("token vencido -> 401")
    void vencido() {
        assertEquals(401, llamar("GET", "/api/usuarios", token(SECRETO, "1", "ADMIN", Instant.now().minusSeconds(60))));
    }

    @Test
    @DisplayName("token mal formado -> 401")
    void malFormado() {
        assertEquals(401, llamar("GET", "/api/usuarios", "esto.no.es-un-jwt"));
    }

    @Test
    @DisplayName("el rechazo responde JSON con status y message")
    void formatoError() {
        MockServerWebExchange exchange = MockServerWebExchange.from(MockServerHttpRequest.get("/api/usuarios"));
        filtro.filter(exchange, e -> Mono.empty()).block();
        String cuerpo = exchange.getResponse().getBodyAsString().block();
        assertEquals(401, exchange.getResponse().getStatusCode().value());
        assertEquals(true, cuerpo.contains("\"status\":401") && cuerpo.contains("\"message\""), cuerpo);
    }
}
