package cl.artcrate.pagos.exception;

/** Se lanza cuando el usuario autenticado intenta usar datos de otro usuario (responde 403). */
public class ProhibidoException extends RuntimeException {
    public ProhibidoException(String mensaje) {
        super(mensaje);
    }
}
