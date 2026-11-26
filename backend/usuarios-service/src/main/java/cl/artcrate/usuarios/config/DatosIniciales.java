package cl.artcrate.usuarios.config;

import cl.artcrate.usuarios.model.Rol;
import cl.artcrate.usuarios.model.Usuario;
import cl.artcrate.usuarios.repository.UsuarioRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

/** Carga los usuarios de prueba al arrancar (administrador, encargado de tienda y cliente). */
@Configuration
public class DatosIniciales {

    @Bean
    CommandLineRunner cargarUsuarios(UsuarioRepository repository, PasswordEncoder encoder, JdbcTemplate jdbc) {
        return args -> {
            ampliarColumnaRol(jdbc);
            if (repository.count() == 0) {
                repository.save(crear("Admin", "ArtCrate", "admin@artcrate.cl", "Admin123", Rol.ADMIN, encoder));
                repository.save(crear("Cliente", "Prueba", "cliente@artcrate.cl", "Cliente123", Rol.CLIENTE, encoder));
            }
            // se agrega aparte para que también aparezca en bases creadas antes de este rol
            if (!repository.existsByCorreo("encargado@artcrate.cl")) {
                repository.save(crear("Encargado", "Tienda", "encargado@artcrate.cl", "Encargado123", Rol.ENCARGADO, encoder));
            }
        };
    }

    /** Las bases antiguas guardaban el rol como ENUM('ADMIN','CLIENTE'), que no admite roles nuevos. */
    private void ampliarColumnaRol(JdbcTemplate jdbc) {
        String tipo = jdbc.queryForObject(
                "SELECT DATA_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() "
                        + "AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'rol'", String.class);
        if ("enum".equalsIgnoreCase(tipo)) {
            jdbc.execute("ALTER TABLE usuarios MODIFY rol VARCHAR(20) NOT NULL");
        }
    }

    private Usuario crear(String nombre, String apellido, String correo, String password, Rol rol,
            PasswordEncoder encoder) {
        Usuario u = new Usuario();
        u.setNombre(nombre);
        u.setApellido(apellido);
        u.setCorreo(correo);
        u.setPasswordHash(encoder.encode(password));
        u.setTelefono("+56912345678");
        u.setRegion("Metropolitana de Santiago");
        u.setRol(rol);
        u.setActivo(true);
        return u;
    }
}
