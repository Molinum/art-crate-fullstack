package cl.artcrate.usuarios.seguridad;

import static org.junit.jupiter.api.Assertions.assertEquals;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import javax.crypto.SecretKey;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

/** Reglas de acceso de usuarios-service: quién puede llamar a cada ruta según su token. */
class FiltroJwtTest {

    private static final String SECRETO = "artcrate-clave-jwt-solo-para-desarrollo-2026";
    private final FiltroJwt filtro = new FiltroJwt(SECRETO);

    private static String token(String secreto, String id, String rol, Instant vence) {
        SecretKey clave = Keys.hmacShaKeyFor(secreto.getBytes(StandardCharsets.UTF_8));
        return Jwts.builder().subject(id).claim("rol", rol)
                .issuedAt(Date.from(Instant.now().minusSeconds(10))).expiration(Date.from(vence))
                .signWith(clave).compact();
    }

    private static String valido(String id, String rol) {
        return token(SECRETO, id, rol, Instant.now().plusSeconds(600));
    }

    /** Devuelve 200 si la petición llegó al controlador, o el código con que la rechazó el filtro. */
    private int llamar(String metodo, String ruta, String token) throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest(metodo, ruta);
        if (token != null) req.addHeader("Authorization", "Bearer " + token);
        MockHttpServletResponse res = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();
        filtro.doFilter(req, res, chain);
        return chain.getRequest() != null ? 200 : res.getStatus();
    }

    // quien: "-" = sin token, o "ROL:idUsuario"
    @ParameterizedTest(name = "{0}: {1} {2} como {3} -> {4}")
    @CsvSource(delimiter = '|', value = {
            "login es público | POST | /api/usuarios/login | - | 200",
            "registro es público | POST | /api/usuarios/registro | - | 200",
            "listar sin token | GET | /api/usuarios | - | 401",
            "cliente no lista usuarios | GET | /api/usuarios | CLIENTE:2 | 403",
            "admin lista usuarios | GET | /api/usuarios | ADMIN:1 | 200",
            "cliente ve su usuario | GET | /api/usuarios/2 | CLIENTE:2 | 200",
            "cliente no ve otro usuario | GET | /api/usuarios/1 | CLIENTE:2 | 403",
            "cliente no se edita (no puede subirse el rol) | PUT | /api/usuarios/2 | CLIENTE:2 | 403",
            "admin edita usuarios | PUT | /api/usuarios/2 | ADMIN:1 | 200",
            "swagger es público | GET | /v3/api-docs | - | 200",
            "preflight CORS es público | OPTIONS | /api/usuarios | - | 200"
    })
    @DisplayName("permisos por ruta y rol")
    void permisos(String caso, String metodo, String ruta, String quien, int esperado) throws Exception {
        String tk = "-".equals(quien) ? null : valido(quien.split(":")[1], quien.split(":")[0]);
        assertEquals(esperado, llamar(metodo, ruta, tk), caso);
    }

    @Test
    @DisplayName("un token firmado con otra clave se rechaza")
    void tokenConOtraClave() throws Exception {
        String falso = token("otra-clave-distinta-de-32-caracteres-o-mas!!", "1", "ADMIN", Instant.now().plusSeconds(600));
        assertEquals(401, llamar("GET", "/api/usuarios", falso));
    }

    @Test
    @DisplayName("un token vencido se rechaza")
    void tokenVencido() throws Exception {
        String vencido = token(SECRETO, "1", "ADMIN", Instant.now().minusSeconds(60));
        assertEquals(401, llamar("GET", "/api/usuarios", vencido));
    }

    @Test
    @DisplayName("un token mal formado se rechaza")
    void tokenMalFormado() throws Exception {
        assertEquals(401, llamar("GET", "/api/usuarios", "esto.no.es-un-jwt"));
    }

    @Test
    @DisplayName("el usuario y el rol quedan disponibles para el controlador, tomados del token")
    void atributosDeLaPeticion() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/usuarios");
        req.addHeader("Authorization", "Bearer " + valido("1", "ADMIN"));
        req.addHeader("X-Usuario-Id", "999"); // una cabecera falsa no debe contar
        filtro.doFilter(req, new MockHttpServletResponse(), new MockFilterChain());
        assertEquals("1", req.getAttribute(FiltroJwt.ATRIBUTO_USUARIO));
        assertEquals("ADMIN", req.getAttribute(FiltroJwt.ATRIBUTO_ROL));
    }

    @Test
    @DisplayName("el rechazo responde JSON con el formato de errores del proyecto")
    void formatoDelError() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/usuarios");
        MockHttpServletResponse res = new MockHttpServletResponse();
        filtro.doFilter(req, res, new MockFilterChain());
        assertEquals(401, res.getStatus());
        String cuerpo = res.getContentAsString();
        assertEquals(true, cuerpo.contains("\"status\":401") && cuerpo.contains("\"message\""), cuerpo);
    }
}
