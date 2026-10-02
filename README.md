# NGG API

Backend de autenticación para el proyecto NGG. Construido con Fastify, Drizzle ORM y PostgreSQL. Maneja login, sesiones vía JWT en cookie httpOnly, roles de usuario, e invitaciones para registro controlado (sin registro público abierto).

## Stack

- [Fastify](https://fastify.dev/) — servidor HTTP
- [Drizzle ORM](https://orm.drizzle.team/) — acceso a base de datos
- [PostgreSQL](https://www.postgresql.org/) — base de datos
- [bcryptjs](https://github.com/dcodeIO/bcrypt.js) — hasheo de contraseñas
- [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) — sesiones vía JWT

## Requisitos

- Node.js 20 o superior
- Una base de datos PostgreSQL accesible (local, Docker, o remota)

## Instalación

```bash
npm install
```

## Configuración

1. Copia el archivo de ejemplo:

```bash
   cp .env.example .env
```

2. Completa las variables en `.env`:

   | Variable                                   | Descripción                                                              |
   | ------------------------------------------ | ------------------------------------------------------------------------ |
   | `DATABASE_URL`                             | Cadena de conexión a PostgreSQL                                          |
   | `JWT_SECRET`                               | Secret para firmar JWT. Genera uno con `openssl rand -base64 48`         |
   | `COOKIE_DOMAIN`                            | Dominio donde se setea la cookie de sesión                               |
   | `FRONTEND_ORIGIN`                          | Origen exacto permitido por CORS (protocolo + dominio + puerto)          |
   | `PORT`                                     | Puerto donde corre el servidor (default: 4000)                           |
   | `NODE_ENV`                                 | `development` o `production`. En producción, las cookies requieren HTTPS |
   | `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Credenciales del admin inicial (solo para el seed)                       |


### Desarrollo local con dominios personalizados

Como las cookies dependen de dominios reales (no funcionan igual con `localhost`), para desarrollar localmente necesitas simular tus dominios. Edita tu archivo `hosts`:

- Linux/Mac: `/etc/hosts`
- Windows: `C:\Windows\System32\drivers\etc\hosts`

Agrega:
127.0.0.1 api.tudominio.cl
127.0.0.1 login.tudominio.cl

Y usa esos dominios (con el puerto correspondiente) en tu navegador y en `FRONTEND_ORIGIN`/`COOKIE_DOMAIN`, en vez de `localhost`.

## Base de datos

### Generar y aplicar migraciones

```bash
npm run db:generate   # genera el SQL a partir de src/db/schema.ts
npm run db:migrate     # aplica las migraciones a la base de datos
```

### Crear el usuario administrador inicial

```bash
npm run db:seed
```

Este script es idempotente: si el email ya existe, no hace nada. Usa `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD` de tu `.env`.

### Explorar la base de datos (opcional)

```bash
npm run db:studio
```

Abre Drizzle Studio, una UI web para ver y editar los datos.

## Desarrollo

```bash
npm run dev
```

Levanta el servidor con recarga automática en `http://localhost:{PORT}` (o el dominio que hayas configurado).

## Producción

```bash
npm run build
npm start
```

## Endpoints

| Método | Ruta                  | Descripción                                   | Protección                      |
| ------ | --------------------- | --------------------------------------------- | ------------------------------- |
| POST   | `/login`              | Inicia sesión                                 | Público                         |
| GET    | `/me`                 | Verifica la sesión actual                     | Requiere sesión                 |
| POST   | `/logout`             | Cierra sesión                                 | Público                         |
| POST   | `/register`           | Crea una cuenta usando un token de invitación | Público (requiere token válido) |
| POST   | `/invitations`        | Genera una invitación para registro           | Solo admin                      |
| GET    | `/invitations/:token` | Valida un token de invitación                 | Público                         |
| GET    | `/users`              | Lista todos los usuarios                      | Solo admin                      |
| PATCH  | `/users/:id`          | Cambia el rol de un usuario                   | Solo admin                      |
| DELETE | `/users/:id`          | Elimina un usuario                            | Solo admin                      |

## Notas de seguridad

- Las contraseñas se almacenan hasheadas con bcrypt (12 rounds), nunca en texto plano.
- Las sesiones usan cookies `httpOnly`, lo que impide que JavaScript del lado del cliente las lea (mitiga robo de sesión vía XSS).
- No existe endpoint de registro público: las cuentas solo se crean mediante invitación generada por un administrador.
- Un administrador no puede eliminarse ni quitarse su propio rol a sí mismo, y el sistema no permite que quede sin ningún administrador.
