package cl.artcrate.carrito.seguridad;

import feign.RequestInterceptor;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Las llamadas a otros servicios llevan un token propio con rol SERVICIO (firmado con la clave compartida). */
@Configuration
public class SeguridadFeign {

    @Bean
    RequestInterceptor tokenDeServicio(@Value("${artcrate.jwt.secret}") String secreto,
                                       @Value("${spring.application.name}") String nombre) {
        SecretKey clave = Keys.hmacShaKeyFor(secreto.getBytes(StandardCharsets.UTF_8));
        return plantilla -> {
            Instant ahora = Instant.now();
            String token = Jwts.builder()
                    .subject(nombre)
                    .claim("rol", "SERVICIO")
                    .issuedAt(Date.from(ahora))
                    .expiration(Date.from(ahora.plusSeconds(300)))
                    .signWith(clave)
                    .compact();
            plantilla.header("Authorization", "Bearer " + token);
        };
    }
}
