package cl.artcrate.usuarios.model;

/** Tipo de usuario del sistema. */
public enum Rol {
    CLIENTE,
    ENCARGADO, // encargado de tienda: productos, categorías, stock y pedidos
    ADMIN // además, usuarios y roles
}
