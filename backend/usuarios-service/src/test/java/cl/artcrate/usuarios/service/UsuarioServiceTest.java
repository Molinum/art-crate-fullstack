package cl.artcrate.usuarios.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import cl.artcrate.usuarios.dto.ActualizarUsuarioRequest;
import cl.artcrate.usuarios.dto.LoginRequest;
import cl.artcrate.usuarios.dto.LoginResponse;
import cl.artcrate.usuarios.dto.RegistroRequest;
import cl.artcrate.usuarios.dto.UsuarioResponse;
import cl.artcrate.usuarios.exception.ConflictoException;
import cl.artcrate.usuarios.exception.CredencialesInvalidasException;
import cl.artcrate.usuarios.exception.ProhibidoException;
import cl.artcrate.usuarios.exception.RecursoNoEncontradoException;
import cl.artcrate.usuarios.model.Rol;
import cl.artcrate.usuarios.model.Usuario;
import cl.artcrate.usuarios.repository.UsuarioRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class UsuarioServiceTest {

    @Mock UsuarioRepository repository;
    final PasswordEncoder encoder = new BCryptPasswordEncoder();
    final JwtService jwt = new JwtService("artcrate-clave-jwt-solo-para-desarrollo-2026", 8);
    UsuarioService service;

    @BeforeEach
    void iniciar() {
        service = new UsuarioService(repository, encoder, jwt);
    }

    private RegistroRequest registro(String correo) {
        return new RegistroRequest("Ana", "Pérez", correo, "Clave1234", "+56911111111", "Biobío");
    }

    private Usuario guardado(String correo, String password, boolean activo, Rol rol) {
        Usuario u = new Usuario();
        u.setId(5L);
        u.setNombre("Ana");
        u.setApellido("Pérez");
        u.setCorreo(correo);
        u.setPasswordHash(encoder.encode(password));
        u.setRol(rol);
        u.setActivo(activo);
        return u;
    }

    // ----- registro -----

    @Test
    @DisplayName("registrar guarda al usuario como CLIENTE, con el correo normalizado")
    void registrarComoCliente() {
        when(repository.existsByCorreo("ana@correo.cl")).thenReturn(false);
        when(repository.save(any(Usuario.class))).thenAnswer(i -> i.getArgument(0));

        UsuarioResponse r = service.registrar(registro("  ANA@Correo.cl "));

        assertEquals("ana@correo.cl", r.correo());
        assertEquals(Rol.CLIENTE, r.rol());
        assertTrue(r.activo());
    }

    @Test
    @DisplayName("registrar nunca guarda la contraseña en texto plano")
    void guardaSoloElHash() {
        when(repository.save(any(Usuario.class))).thenAnswer(i -> i.getArgument(0));
        service.registrar(registro("ana@correo.cl"));

        ArgumentCaptor<Usuario> captor = ArgumentCaptor.forClass(Usuario.class);
        verify(repository).save(captor.capture());
        String hash = captor.getValue().getPasswordHash();
        assertNotEquals("Clave1234", hash);
        assertTrue(hash.startsWith("$2"), "debe ser un hash BCrypt");
        assertTrue(encoder.matches("Clave1234", hash));
    }

    @Test
    @DisplayName("registrar con un correo que ya existe responde conflicto")
    void correoRepetido() {
        when(repository.existsByCorreo("ana@correo.cl")).thenReturn(true);
        assertThrows(ConflictoException.class, () -> service.registrar(registro("ana@correo.cl")));
        verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("el hash BCrypt es distinto en cada llamada pero ambos validan la misma clave")
    void saltDistinto() {
        String a = encoder.encode("Clave1234");
        String b = encoder.encode("Clave1234");
        assertNotEquals(a, b);
        assertTrue(encoder.matches("Clave1234", a));
        assertTrue(encoder.matches("Clave1234", b));
    }

    // ----- login -----

    @Test
    @DisplayName("login correcto devuelve un token y el usuario")
    void loginOk() {
        when(repository.findByCorreo("ana@correo.cl")).thenReturn(Optional.of(guardado("ana@correo.cl", "Clave1234", true, Rol.CLIENTE)));

        LoginResponse r = service.login(new LoginRequest(" Ana@Correo.cl ", "Clave1234"));

        assertFalse(r.token().isBlank());
        assertEquals(3, r.token().split("\\.").length, "un JWT tiene 3 partes");
        assertEquals("ana@correo.cl", r.usuario().correo());
    }

    @Test
    @DisplayName("login con contraseña incorrecta falla")
    void passwordIncorrecta() {
        when(repository.findByCorreo("ana@correo.cl")).thenReturn(Optional.of(guardado("ana@correo.cl", "Clave1234", true, Rol.CLIENTE)));
        assertThrows(CredencialesInvalidasException.class, () -> service.login(new LoginRequest("ana@correo.cl", "otra")));
    }

    @Test
    @DisplayName("login con correo inexistente da el mismo mensaje que con contraseña incorrecta")
    void mismoMensaje() {
        when(repository.findByCorreo("nadie@correo.cl")).thenReturn(Optional.empty());
        when(repository.findByCorreo("ana@correo.cl")).thenReturn(Optional.of(guardado("ana@correo.cl", "Clave1234", true, Rol.CLIENTE)));

        var sinCorreo = assertThrows(CredencialesInvalidasException.class, () -> service.login(new LoginRequest("nadie@correo.cl", "x")));
        var sinClave = assertThrows(CredencialesInvalidasException.class, () -> service.login(new LoginRequest("ana@correo.cl", "x")));
        assertEquals(sinCorreo.getMessage(), sinClave.getMessage());
    }

    @Test
    @DisplayName("un usuario desactivado no puede iniciar sesión aunque la clave sea correcta")
    void usuarioDesactivado() {
        when(repository.findByCorreo("ana@correo.cl")).thenReturn(Optional.of(guardado("ana@correo.cl", "Clave1234", false, Rol.CLIENTE)));
        assertThrows(CredencialesInvalidasException.class, () -> service.login(new LoginRequest("ana@correo.cl", "Clave1234")));
    }

    // ----- eliminar y actualizar -----

    @Test
    @DisplayName("los usuarios no se eliminan: responde conflicto y no borra nada")
    void noSeElimina() {
        when(repository.findById(5L)).thenReturn(Optional.of(guardado("ana@correo.cl", "Clave1234", true, Rol.CLIENTE)));
        assertThrows(ConflictoException.class, () -> service.eliminar(5L));
        verify(repository, never()).delete(any());
        verify(repository, never()).deleteById(any());
    }

    @Test
    @DisplayName("eliminar un usuario inexistente responde no encontrado")
    void eliminarInexistente() {
        when(repository.findById(99L)).thenReturn(Optional.empty());
        assertThrows(RecursoNoEncontradoException.class, () -> service.eliminar(99L));
    }

    @Test
    @DisplayName("actualizar sin rol ni activo los deja como estaban")
    void actualizarSinRolNiActivo() {
        when(repository.findById(5L)).thenReturn(Optional.of(guardado("ana@correo.cl", "Clave1234", true, Rol.ADMIN)));
        when(repository.save(any(Usuario.class))).thenAnswer(i -> i.getArgument(0));

        UsuarioResponse r = service.actualizar(5L, new ActualizarUsuarioRequest(" Nueva ", "Pérez", null, "Biobío", null, null), 5L);

        assertEquals("Nueva", r.nombre());
        assertEquals(Rol.ADMIN, r.rol());
        assertTrue(r.activo());
    }

    @Test
    @DisplayName("actualizar puede cambiar el rol y desactivar al usuario")
    void actualizarRolYActivo() {
        Usuario admin = guardado("admin@correo.cl", "Clave1234", true, Rol.ADMIN);
        admin.setId(1L);
        when(repository.findById(1L)).thenReturn(Optional.of(admin));
        when(repository.findById(5L)).thenReturn(Optional.of(guardado("ana@correo.cl", "Clave1234", true, Rol.CLIENTE)));
        when(repository.save(any(Usuario.class))).thenAnswer(i -> i.getArgument(0));

        UsuarioResponse r = service.actualizar(5L, new ActualizarUsuarioRequest("Ana", "Pérez", null, null, Rol.ADMIN, false), 1L);

        assertEquals(Rol.ADMIN, r.rol());
        assertFalse(r.activo());
    }

    @Test
    @DisplayName("un administrador no puede cambiar su propio rol")
    void noCambiaSuPropioRol() {
        when(repository.findById(5L)).thenReturn(Optional.of(guardado("ana@correo.cl", "Clave1234", true, Rol.ADMIN)));

        assertThrows(ConflictoException.class, () -> service.actualizar(5L,
                new ActualizarUsuarioRequest("Ana", "Pérez", null, null, Rol.CLIENTE, null), 5L));
        verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("quien ya no es administrador no puede cambiar roles, aunque conserve un token antiguo")
    void sinRolEnLaBaseNoCambiaRoles() {
        Usuario exAdmin = guardado("ex@correo.cl", "Clave1234", true, Rol.ENCARGADO);
        exAdmin.setId(7L);
        when(repository.findById(5L)).thenReturn(Optional.of(guardado("ana@correo.cl", "Clave1234", true, Rol.CLIENTE)));
        when(repository.findById(7L)).thenReturn(Optional.of(exAdmin));

        assertThrows(ProhibidoException.class, () -> service.actualizar(5L,
                new ActualizarUsuarioRequest("Ana", "Pérez", null, null, Rol.ADMIN, null), 7L));
        verify(repository, never()).save(any());
    }
}
