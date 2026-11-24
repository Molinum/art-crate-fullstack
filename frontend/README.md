# ArtCrate - Frontend (React)

Tienda online de insumos de arte. Proyecto del curso Desarrollo Fullstack 2 (Duoc UC).

Es la versión en React + TypeScript del sitio estático original ([ArtCrate](https://github.com/Molinum/ArtCrate)). Consume la API del [backend](../backend/README.md) a través del gateway.

## Tecnologías

- React 19 y TypeScript
- Vite
- React Router
- Bootstrap 5.3 y CSS propio (`src/styles.css`)

## Requisitos

- Node.js 20.19 o superior (o 22.12+)
- El backend corriendo en `http://localhost:8080` (ver [`../backend`](../backend/README.md): MySQL con Docker, Eureka, los microservicios y el gateway)

## Cómo ejecutarlo

```bash
npm install
npm run dev
```

Se abre en http://localhost:5173. Sin el backend arriba, las páginas que piden datos muestran un mensaje de error.

Otros comandos:

```bash
npm run build     # compila para producción (carpeta dist)
npm run preview   # sirve la versión compilada
npm run lint
```

La dirección del gateway está en `src/services/api.service.ts` (`API_URL`).

Es una SPA: si se publica el resultado de `npm run build`, el servidor tiene que devolver `index.html` para cualquier ruta.

## Páginas

| Ruta | Descripción |
|---|---|
| `/` | Inicio con categorías y productos destacados |
| `/catalogo` | Productos con filtro por categoría y búsqueda |
| `/producto/:id` | Detalle y botón para agregar al carrito |
| `/login`, `/registro` | Inicio de sesión y creación de cuenta |
| `/carrito` | Carrito, cambio de cantidades y datos de despacho para crear el pedido |
| `/pedidos`, `/pedidos/:id` | Lista de pedidos del usuario y su detalle: seguimiento, productos, despacho, pago y cancelación |
| `/contacto`, `/nosotros`, `/faq` | Páginas informativas |
| `/admin` | Panel de administración (solo rol ADMIN): ventas, pedidos por enviar, stock bajo, últimos pedidos, más vendidos y ventas por categoría |
| `/admin/productos` | Productos con filtros, edición y activar o desactivar. Los productos no se eliminan, para conservar el historial de pedidos |
| `/admin/pedidos`, `/admin/pedidos/:id` | Lista de pedidos filtrable por estado y detalle con cliente, pago y cambio de estado |

## Estructura

```
src/
├── components/   Layout, AdminLayout, tarjetas y mensajes de carga o error
├── context/      Sesión del usuario
├── pages/        Una página por ruta (admin/ para el panel)
├── services/     Llamadas a la API
├── types/        Tipos que reflejan las respuestas del backend
├── hooks.ts      useApi, para cargar datos con estado de carga y error
└── styles.css    Estilos propios
public/assets/img/  Imágenes de los productos y categorías
```

## Pruebas unitarias

Vitest + Testing Library (no necesitan el backend):

```
npm test            # corre todas una vez
npm run test:watch  # se vuelve a ejecutar al guardar
```

Cubren las validaciones de tarjeta (Luhn y vencimiento), el formulario de pago, la sesión (token guardado y cierre), el envío del token y el manejo de errores 401/4xx/5xx en las llamadas a la API, el botón "Agregar al carrito" de las tarjetas del catálogo (sin sesión, sin stock, errores del servidor) y las reglas de negocio compartidas.

## Usuarios de prueba

El backend los crea al arrancar por primera vez:

- `cliente@artcrate.cl` / `Cliente123`
- `admin@artcrate.cl` / `Admin123`

## Limitaciones

- El backend no usa JWT ni valida roles. La sesión se guarda en `localStorage` y el acceso al panel de administración solo se controla en el front.
- El formulario de contacto no envía nada, porque no hay un servicio que lo reciba.
- Las imágenes de los productos son SVG de ejemplo.
- No hay pruebas automáticas.

## Autor

[@Molinum](https://github.com/Molinum)
