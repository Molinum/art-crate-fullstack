package cl.artcrate.usuarios.service;

import cl.artcrate.usuarios.model.Usuario;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/** Genera los tokens JWT (HS256). El gateway los valida con la misma clave. */
@Service
public class JwtService {

    private final SecretKey clave;
    private final Duration expiracion;

    public JwtService(@Value("${artcrate.jwt.secret}") String secreto,
                      @Value("${artcrate.jwt.expiracion-horas}") long horas) {
        this.clave = Keys.hmacShaKeyFor(secreto.getBytes(StandardCharsets.UTF_8));
        this.expiracion = Duration.ofHours(horas);
    }

    /** subject = id del usuario; el rol viaja como claim para que el gateway decida los permisos. */
    public String generar(Usuario usuario) {
        Instant ahora = Instant.now();
        return Jwts.builder()
                .subject(String.valueOf(usuario.getId()))
                .claim("rol", usuario.getRol().name())
                .claim("correo", usuario.getCorreo())
                .issuedAt(Date.from(ahora))
                .expiration(Date.from(ahora.plus(expiracion)))
                .signWith(clave)
                .compact();
    }
}
