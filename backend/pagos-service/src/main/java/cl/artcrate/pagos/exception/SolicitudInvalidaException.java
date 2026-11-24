package cl.artcrate.pagos.exception;

/** Se lanza cuando faltan datos para la operación pedida (responde 400). */
public class SolicitudInvalidaException extends RuntimeException {
    public SolicitudInvalidaException(String mensaje) {
        super(mensaje);
    }
}
