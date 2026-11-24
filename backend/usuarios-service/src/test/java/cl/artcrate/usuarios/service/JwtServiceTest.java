package cl.artcrate.usuarios.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import cl.artcrate.usuarios.model.Rol;
import cl.artcrate.usuarios.model.Usuario;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Date;
import javax.crypto.SecretKey;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class JwtServiceTest {

    private static final String SECRETO = "artcrate-clave-jwt-solo-para-desarrollo-2026";
    private final JwtService jwt = new JwtService(SECRETO, 8);

    private Usuario usuario(long id, Rol rol) {
        Usuario u = new Usuario();
        u.setId(id);
        u.setCorreo("a@b.cl");
        u.setRol(rol);
        return u;
    }

    private Claims leer(String token, String secreto) {
        SecretKey clave = Keys.hmacShaKeyFor(secreto.getBytes(StandardCharsets.UTF_8));
        return Jwts.parser().verifyWith(clave).build().parseSignedClaims(token).getPayload();
    }

    @Test
    @DisplayName("el token lleva el id como subject y el rol como claim")
    void claims() {
        Claims c = leer(jwt.generar(usuario(7, Rol.ADMIN)), SECRETO);
        assertEquals("7", c.getSubject());
        assertEquals("ADMIN", c.get("rol", String.class));
        assertEquals("a@b.cl", c.get("correo", String.class));
    }

    @Test
    @DisplayName("el token vence en el tiempo configurado (8 horas)")
    void vencimiento() {
        Claims c = leer(jwt.generar(usuario(1, Rol.CLIENTE)), SECRETO);
        long horas = Duration.between(c.getIssuedAt().toInstant(), c.getExpiration().toInstant()).toHours();
        assertEquals(8, horas);
        assertTrue(c.getExpiration().after(new Date()));
    }

    @Test
    @DisplayName("solo se puede verificar con la misma clave con que se firmó")
    void otraClave() {
        String token = jwt.generar(usuario(1, Rol.CLIENTE));
        assertThrows(JwtException.class, () -> leer(token, "otra-clave-distinta-de-32-caracteres-o-mas!!"));
    }

    @Test
    @DisplayName("no se aceptan claves más cortas de 32 caracteres")
    void claveCorta() {
        assertThrows(RuntimeException.class, () -> new JwtService("corta", 8));
    }
}
