package cl.artcrate.usuarios.dto;

/** Respuesta del login: el token JWT que el cliente envía en cada petición y los datos del usuario. */
public record LoginResponse(String token, UsuarioResponse usuario) {
}
