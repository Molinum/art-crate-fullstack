package cl.artcrate.catalogo.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Lista explícita de servidores para Swagger: el gateway primero (es la dirección real que usan
 * el front y Postman) y el puerto propio como alternativa para probar este servicio aislado.
 * Sin este bean, springdoc adivina un solo servidor a partir de la petición que llega (el puerto
 * propio si se entra directo, o el del gateway si se entra a través de él), así que "Probar"
 * (Try it out) desde la pantalla agregada del gateway (http://localhost:8080/swagger-ui.html)
 * fallaría por CORS: ese puerto es el único que lo tiene habilitado.
 */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI openApi() {
        // Botón "Authorize": se pega el token que devuelve el login y Swagger lo envía como Bearer
        SecurityScheme jwt = new SecurityScheme().type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT");
        return new OpenAPI()
                .components(new Components().addSecuritySchemes("jwt", jwt))
                .addSecurityItem(new SecurityRequirement().addList("jwt"))
                .servers(List.of(
                new Server().url("http://localhost:8080").description("A través del gateway (recomendado)"),
                new Server().url("http://localhost:8082").description("Directo a este servicio")
        ));
    }
}
