package cl.artcrate.gateway;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Pattern;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

/**
 * Valida el JWT de cada petición antes de enviarla al servicio.
 *
 *   - Sin token o token inválido/vencido -> 401
 *   - Token válido pero sin permiso      -> 403
 *   - Si pasa, agrega X-Usuario-Id y X-Usuario-Rol para los servicios (y borra los que haya mandado el cliente).
 *
 * Los servicios se llaman entre sí directo por Eureka (sin pasar por aquí), así que solo se protege la entrada.
 */
@Component
public class FiltroJwt implements GlobalFilter, Ordered {

    private static final Pattern ID_EN_RUTA = Pattern.compile("^/api/(?:usuarios|carritos|pedidos/usuario)/(\\d+)(?:/.*)?$");

    private final SecretKey clave;
    private final ObjectMapper mapper;

    public FiltroJwt(@Value("${artcrate.jwt.secret}") String secreto, ObjectMapper mapper) {
        this.clave = Keys.hmacShaKeyFor(secreto.getBytes(StandardCharsets.UTF_8));
        this.mapper = mapper;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        HttpMethod metodo = exchange.getRequest().getMethod();
        String ruta = exchange.getRequest().getPath().value();

        if (esPublica(metodo, ruta)) {
            return chain.filter(exchange);
        }

        Claims claims = leerToken(exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION));
        if (claims == null) {
            return rechazar(exchange, HttpStatus.UNAUTHORIZED, "Debes iniciar sesión para continuar");
        }
        boolean admin = "ADMIN".equals(claims.get("rol", String.class));
        if (!tienePermiso(metodo, ruta, claims.getSubject(), admin)) {
            return rechazar(exchange, HttpStatus.FORBIDDEN, "No tienes permiso para realizar esta acción");
        }

        var peticion = exchange.getRequest().mutate()
                .headers(h -> {
                    h.remove("X-Usuario-Id");
                    h.remove("X-Usuario-Rol");
                    h.add("X-Usuario-Id", claims.getSubject());
                    h.add("X-Usuario-Rol", claims.get("rol", String.class));
                })
                .build();
        return chain.filter(exchange.mutate().request(peticion).build());
    }

    /** Rutas que no piden sesión: login, registro, catálogo (solo lectura), stock (solo lectura) y documentación. */
    private boolean esPublica(HttpMethod metodo, String ruta) {
        if (HttpMethod.OPTIONS.equals(metodo)) return true; // preflight de CORS
        if (ruta.startsWith("/docs/") || ruta.startsWith("/v3/") || ruta.startsWith("/swagger") || ruta.startsWith("/webjars/")) return true;
        if (HttpMethod.POST.equals(metodo) && (ruta.equals("/api/usuarios/login") || ruta.equals("/api/usuarios/registro"))) return true;
        boolean lectura = HttpMethod.GET.equals(metodo);
        return lectura && (ruta.startsWith("/api/productos") || ruta.startsWith("/api/categorias") || ruta.startsWith("/api/inventario"));
    }

    private boolean tienePermiso(HttpMethod metodo, String ruta, String usuarioId, boolean admin) {
        if (admin) return true;
        // Un cliente solo puede ver SU usuario, SU carrito y SUS pedidos
        var coincidencia = ID_EN_RUTA.matcher(ruta);
        if (coincidencia.matches()) {
            boolean propio = coincidencia.group(1).equals(usuarioId);
            boolean soloLectura = ruta.startsWith("/api/usuarios/") ? HttpMethod.GET.equals(metodo) : true;
            return propio && soloLectura;
        }
        // Crear pedidos y pagar: cualquier usuario con sesión
        if (HttpMethod.POST.equals(metodo) && (ruta.equals("/api/pedidos") || ruta.equals("/api/pagos"))) return true;
        if (HttpMethod.GET.equals(metodo) && (ruta.matches("^/api/pedidos/\\d+$") || ruta.startsWith("/api/pagos/"))) return true;
        // Todo lo demás (listar usuarios y pedidos, editar catálogo e inventario, cambiar estados) es solo del administrador
        return false;
    }

    private Claims leerToken(String cabecera) {
        if (cabecera == null || !cabecera.startsWith("Bearer ")) return null;
        try {
            return Jwts.parser().verifyWith(clave).build().parseSignedClaims(cabecera.substring(7)).getPayload();
        } catch (JwtException | IllegalArgumentException e) {
            return null; // firma inválida, token vencido o mal formado
        }
    }

    private Mono<Void> rechazar(ServerWebExchange exchange, HttpStatus estado, String mensaje) {
        ServerHttpResponse respuesta = exchange.getResponse();
        respuesta.setStatusCode(estado);
        respuesta.getHeaders().setContentType(MediaType.APPLICATION_JSON);
        Map<String, Object> cuerpo = new LinkedHashMap<>();
        cuerpo.put("timestamp", LocalDateTime.now().toString());
        cuerpo.put("status", estado.value());
        cuerpo.put("error", estado.getReasonPhrase());
        cuerpo.put("message", mensaje);
        try {
            return respuesta.writeWith(Mono.just(respuesta.bufferFactory().wrap(mapper.writeValueAsBytes(cuerpo))));
        } catch (Exception e) {
            return respuesta.setComplete();
        }
    }

    @Override
    public int getOrder() {
        return -1; // antes de que se enrute la petición
    }
}
