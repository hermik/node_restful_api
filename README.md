# node-api

This is my implementation of a modern Node.js RESTful API. It provides a solid starting point / boilerplate for building production-ready APIs.

The project follows a well-structured, modular, layered architecture:

`request -> controller -> service -> repository -> db`

* **Controller**: Lightweight layer that handles requests and calls the service.
* **Service**: Contains business logic. It does not need to know anything about HTTP requests or databases.
* **Repository**: Communicates with the database. Different databases can be used by providing different repository implementations.

## REST API

Stack: **Fastify + TypeScript + Drizzle ORM (PostgreSQL)**
Architecture: `controller -> service -> repository -> db`
Authentication: JWT (`@fastify/jwt`) + refresh tokens
Validation: Every request and response is validated using Zod
Error handling
Automatic documentation: Swagger/OpenAPI (`@fastify/swagger` + `@fastify/swagger-ui`)
Tests: Tests are located in `modules/<module>/*.test.ts` and use Jest.

## Stack

* **Fastify 5** — Express replacement
* **TypeScript** — `NodeNext` modules (relative imports with the `.js` extension)
* **Zod** + `fastify-type-provider-zod` — request and response validation
* **Drizzle ORM** (`postgres-js` driver) — database access and migrations
* **@fastify/jwt** — Bearer token authentication using the `fastify.authenticate` hook
* **bcryptjs** — password hashing
* **Jest** — unit testing

## Auth: access token + refresh token

* **Access token** (JWT, signed using `@fastify/jwt`) — short-lived (`JWT_EXPIRES_IN`, default: `15m`).
  It is sent as `Authorization: Bearer <accessToken>` and verified by `fastify.authenticate`.
* **Refresh token** (random string generated using `crypto.randomBytes(40).toString("hex")`) — long-lived
  (`REFRESH_TOKEN_TTL_DAYS`, default: 30 days). Only the **SHA-256 hash** of the token is stored
  in the database (`refresh_tokens`), never the plaintext value — see [auth.service.ts](src/modules/auth/auth.service.ts).
* **Rotation**: Every call to `POST /api/auth/refresh` invalidates the previous refresh token and issues a new token pair
  (access + refresh). Attempting to reuse an already used or revoked token returns `401`.
* **Logout**: `POST /api/auth/logout` with `{ refreshToken }` in the request body invalidates the specified token.

Example endpoints:

| Method | Path                 | Body                    | Auth |
| ------ | -------------------- | ----------------------- | ---- |
| POST   | `/api/auth/register` | `email, password, name` | -    |
| POST   | `/api/auth/login`    | `email, password`       | -    |
| POST   | `/api/auth/refresh`  | `refreshToken`          | -    |
| POST   | `/api/auth/logout`   | `refreshToken`          | -    |

Typical client flow: log in once and store the `refreshToken` in a secure location on the client side.
Use the `accessToken` for regular requests. When a request returns `401` because the access token has expired,
call `/refresh` to obtain a new token pair instead of asking the user to enter their password again.

There is currently no mechanism for cleaning up expired or revoked entries from `refresh_tokens` (for example, using a cron job).
This should be considered when scaling the application.

## Structure

```
src/
  config/env.ts          # environment variable validation (Zod)
  db/
    schema.ts            # Drizzle tables (users, posts)
    client.ts            # Drizzle instance + PostgreSQL client
    migrate.ts           # migration runner
  plugins/
    db.ts                # decorates fastify.db
    jwt.ts               # @fastify/jwt + fastify.authenticate
    swagger.ts           # OpenAPI + Swagger UI (/docs)
    error-handler.ts     # maps errors (AppError, Zod) to JSON responses
  common/errors.ts       # AppError, NotFoundError, ConflictError, UnauthorizedError, ForbiddenError
  modules/
    auth/                # register, login (public)
    users/               # /me (protected), list/details (protected)
    posts/               # GET public, POST/PATCH/DELETE protected + ownership checks
  app.ts                 # builds the Fastify instance and registers plugins and modules
  server.ts              # startup + graceful shutdown
drizzle/                 # generated SQL migrations
drizzle.config.ts        # drizzle-kit configuration
```

Every module follows this structure:

* `*.schema.ts` — Zod schemas
* `*.repository.ts` — database access using Drizzle
* `*.service.ts` — business logic, throws `AppError`
* `*.controller.ts` — lightweight HTTP handlers
* `*.routes.ts` — route registration, layer wiring, and OpenAPI schemas
* `*.test.ts` — unit tests using Jest

## Start

```bash
cp .env.example .env   # fill in JWT_SECRET / DATABASE_URL
npm install
npm run db:migrate     # applies migrations from ./drizzle to the database specified by DATABASE_URL
npm run dev            # tsx watch, http://localhost:3000
```

Swagger documentation: `http://localhost:3000/docs`

## Schema changes / migrations

```bash
# 1. Edit src/db/schema.ts
npm run db:generate   # generates SQL in ./drizzle based on schema changes
npm run db:migrate    # applies migrations to the database
npm run db:studio     # GUI for browsing database data (drizzle-kit studio)
```

## Adding a new module (e.g. "comments")

1. `src/modules/comments/comments.schema.ts` — Zod schemas for body/params/response
2. `src/modules/comments/comments.repository.ts` — class with CRUD methods operating on `Database`
3. `src/modules/comments/comments.service.ts` — business logic, authorization checks, `AppError`
4. `src/modules/comments/comments.controller.ts` — lightweight handlers that call the service
5. `src/modules/comments/comments.routes.ts` — route registration + `schema` (for Swagger) +
   `onRequest: [fastify.authenticate]` for endpoints that require authentication
6. Register the plugin in `src/app.ts`: `await app.register(commentRoutes, { prefix: "/api/comments" })`

## Known limitations / future considerations

* Cache
* Queue such as BullMQ + Redis for delayed operations
* `drizzle-kit` has an indirect, development-only moderate vulnerability in `esbuild`. It only affects
  the local esbuild development server, which is not used by this project while the API is running.
  This should be reviewed when upgrading `drizzle-kit` in the future.

