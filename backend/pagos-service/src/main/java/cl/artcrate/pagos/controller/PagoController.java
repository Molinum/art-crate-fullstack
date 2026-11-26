package cl.artcrate.pagos.controller;

import cl.artcrate.pagos.dto.CrearPagoRequest;
import cl.artcrate.pagos.dto.PagoResponse;
import cl.artcrate.pagos.seguridad.FiltroJwt;
import cl.artcrate.pagos.service.PagoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Endpoints REST de /api/pagos. */
@RestController
@RequestMapping("/api/pagos")
@Tag(name = "Pagos", description = "Pago (simulado) de los pedidos")
public class PagoController {

    private final PagoService service;

    public PagoController(PagoService service) {
        this.service = service;
    }

    @Operation(summary = "Pagar un pedido",
            description = "Responde 201 con el pago; si la tarjeta es rechazada el pago queda con estado RECHAZADO y el pedido sigue pendiente. "
                    + "Tarjetas de prueba (por los últimos 4 dígitos): 0002 rechazada, 9995 fondos insuficientes, 0069 vencida; el resto se aprueba.")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED) // 201
    public PagoResponse pagar(@Valid @RequestBody CrearPagoRequest datos, HttpServletRequest req) {
        return service.pagar(datos, usuario(req), privilegiado(req));
    }

    @Operation(summary = "Obtener un pago por id")
    @GetMapping("/{id}")
    public PagoResponse obtener(@PathVariable Long id, HttpServletRequest req) {
        return service.obtener(id, usuario(req), puedeVer(req));
    }

    @Operation(summary = "Listar los pagos de un pedido")
    @GetMapping("/pedido/{pedidoId}")
    public List<PagoResponse> listarPorPedido(@PathVariable Long pedidoId, HttpServletRequest req) {
        return service.listarPorPedido(pedidoId, usuario(req), puedeVer(req));
    }

    private String usuario(HttpServletRequest req) {
        return (String) req.getAttribute(FiltroJwt.ATRIBUTO_USUARIO);
    }

    /** Para consultar (no para pagar), el encargado de tienda ve los pagos de cualquier pedido. */
    private boolean puedeVer(HttpServletRequest req) {
        return privilegiado(req) || "ENCARGADO".equals(req.getAttribute(FiltroJwt.ATRIBUTO_ROL));
    }

    private boolean privilegiado(HttpServletRequest req) {
        String rol = (String) req.getAttribute(FiltroJwt.ATRIBUTO_ROL);
        return "ADMIN".equals(rol) || "SERVICIO".equals(rol);
    }
}
