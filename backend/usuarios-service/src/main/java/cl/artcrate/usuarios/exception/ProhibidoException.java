package cl.artcrate.usuarios.exception;

/** El usuario tiene sesión, pero no puede hacer esta acción (403). */
public class ProhibidoException extends RuntimeException {

    public ProhibidoException(String mensaje) {
        super(mensaje);
    }
}
