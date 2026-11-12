# ArtCrate - Frontend (React)

Tienda online de insumos de arte. Proyecto del curso Desarrollo Fullstack 2 (Duoc UC).

Es la versión en React + TypeScript del sitio estático original ([ArtCrate](https://github.com/Molinum/ArtCrate)). Consume la API del [backend](https://github.com/Molinum/ArtCrate-backend) a través del gateway.

## Tecnologías

- React 19 y TypeScript
- Vite
- React Router
- Bootstrap 5.3 y CSS propio (`src/styles.css`)

## Requisitos

- Node.js 20.19 o superior (o 22.12+)
- El backend corriendo en `http://localhost:8080` (ver el README del backend: MySQL con Docker, Eureka, los microservicios y el gateway)

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
| `/pedidos` | Pedidos del usuario y pago |
| `/contacto`, `/nosotros`, `/faq` | Páginas informativas |
| `/admin` | Panel de administración (solo rol ADMIN): productos, stock y pedidos |

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
