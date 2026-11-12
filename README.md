# ArtCrate

Tienda online de insumos de arte. Proyecto del curso Desarrollo Fullstack 2 (Duoc UC).

Este repositorio junta las dos partes del proyecto:

| Carpeta | Qué es | Tecnologías |
|---|---|---|
| [`frontend/`](frontend/README.md) | Sitio web de la tienda y panel de administración | React, TypeScript, Vite, Bootstrap |
| [`backend/`](backend/README.md) | API con 6 microservicios, Eureka y un API Gateway | Java 21, Spring Boot, Spring Cloud, MySQL |

El frontend solo habla con el gateway del backend (`http://localhost:8080`).

## Cómo ejecutarlo

Requisitos: Java 21, Maven 3.9+, Docker con `docker compose` y Node.js 20.19 o superior.

**1. Backend** (desde `backend/`):

```bash
docker compose up -d      # MySQL; esperar a que esté "healthy"
mvn clean package         # la primera vez
./run-all.sh              # en Windows: run-all.bat
```

Hay que esperar a que el panel de Eureka (http://localhost:8761) muestre los 7 servicios en estado UP. Hasta entonces, pedidos y carrito pueden responder 503.

**2. Frontend** (desde `frontend/`):

```bash
npm install
npm run dev
```

Se abre en http://localhost:5173.

Para detener todo: `./stop-all.sh` y `docker compose down` en `backend/`, y cerrar Vite.

## Usuarios de prueba

El backend los crea la primera vez que arranca:

- Administrador: `admin@artcrate.cl` / `Admin123`
- Cliente: `cliente@artcrate.cl` / `Cliente123`

## Más información

- [`backend/README.md`](backend/README.md): servicios, puertos, endpoints y datos de ejemplo.
- [`backend/docs/`](backend/docs): arquitectura y modelo de datos.
- [`frontend/README.md`](frontend/README.md): páginas, estructura del código y limitaciones.

## Autor

[@Molinum](https://github.com/Molinum)
