package cl.artcrate.pagos.dto;

import cl.artcrate.pagos.model.MetodoPago;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record CrearPagoRequest(
        @NotNull(message = "El pedidoId es obligatorio")
        Long pedidoId,

        @NotNull(message = "El método de pago es obligatorio (TARJETA o TRANSFERENCIA)")
        MetodoPago metodo,

        // Solo para TARJETA: últimos 4 dígitos (decide el resultado de la simulación, ver PagoService)
        @Pattern(regexp = "\\d{4}", message = "Los últimos dígitos de la tarjeta deben ser 4 números")
        String ultimosDigitos) {
}
