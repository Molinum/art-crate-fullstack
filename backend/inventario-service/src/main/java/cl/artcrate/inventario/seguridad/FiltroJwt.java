package cl.artcrate.inventario.seguridad;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Valida el JWT en este servicio aunque la petición no haya pasado por el gateway (defensa en profundidad).
 *
 *   - Sin token o token inválido/vencido -> 401
 *   - Token válido pero sin permiso      -> 403
 *
 * El usuario y su rol salen SOLO del token (nunca de cabeceras que pueda mandar el cliente) y quedan
 * disponibles como atributos de la petición: ATRIBUTO_USUARIO y ATRIBUTO_ROL.
 * El rol SERVICIO lo usan los servicios al llamarse entre sí (token firmado con la misma clave).
 */
@Component
public class FiltroJwt extends OncePerRequestFilter {

    public static final String ATRIBUTO_USUARIO = "artcrate.usuarioId";
    public static final String ATRIBUTO_ROL = "artcrate.rol";

    private static final ObjectMapper JSON = new ObjectMapper();

    private final SecretKey clave;

    public FiltroJwt(@Value("${artcrate.jwt.secret}") String secreto) {
        this.clave = Keys.hmacShaKeyFor(secreto.getBytes(StandardCharsets.UTF_8));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String metodo = req.getMethod();
        String ruta = req.getRequestURI();

        if (esPublica(metodo, ruta)) {
            chain.doFilter(req, res);
            return;
        }

        Claims claims = leerToken(req.getHeader("Authorization"));
        if (claims == null) {
            rechazar(res, HttpStatus.UNAUTHORIZED, "Debes iniciar sesión para continuar");
            return;
        }
        String usuarioId = claims.getSubject();
        String rol = claims.get("rol", String.class);
        if (!permitido(metodo, ruta, usuarioId, rol)) {
            rechazar(res, HttpStatus.FORBIDDEN, "No tienes permiso para realizar esta acción");
            return;
        }
        req.setAttribute(ATRIBUTO_USUARIO, usuarioId);
        req.setAttribute(ATRIBUTO_ROL, rol);
        chain.doFilter(req, res);
    }

    /** Rutas sin sesión: preflight de CORS y documentación Swagger y lectura del stock. */
    private boolean esPublica(String metodo, String ruta) {
        if ("OPTIONS".equals(metodo)) return true;
        if (ruta.startsWith("/v3/") || ruta.startsWith("/swagger") || ruta.startsWith("/webjars/")) return true;
        return "GET".equals(metodo) && ruta.startsWith("/api/inventario");
    }

    private boolean permitido(String metodo, String ruta, String usuarioId, String rol) {
        boolean privilegiado = "ADMIN".equals(rol) || "SERVICIO".equals(rol);
        return privilegiado || "ENCARGADO".equals(rol); // fijar, descontar y reponer stock: personal o servicios internos
    }

    private Claims leerToken(String cabecera) {
        if (cabecera == null || !cabecera.startsWith("Bearer ")) return null;
        try {
            return Jwts.parser().verifyWith(clave).build().parseSignedClaims(cabecera.substring(7)).getPayload();
        } catch (JwtException | IllegalArgumentException e) {
            return null; // firma inválida, token vencido o mal formado
        }
    }

    private void rechazar(HttpServletResponse res, HttpStatus estado, String mensaje) throws IOException {
        Map<String, Object> cuerpo = new LinkedHashMap<>();
        cuerpo.put("timestamp", LocalDateTime.now().toString());
        cuerpo.put("status", estado.value());
        cuerpo.put("error", estado.getReasonPhrase());
        cuerpo.put("message", mensaje);
        res.setStatus(estado.value());
        res.setContentType("application/json;charset=UTF-8");
        res.getWriter().write(JSON.writeValueAsString(cuerpo));
    }
}
