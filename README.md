# node-api 

This is my implementantion of modern nodejs Restful API. Its good starter point / boilerplate.
Everythink you need for production level API.
This code implements well structured modular approach with those layers:
request->controller->service->repository->db.

Controller: light, hits the service
Service: Here you can put your buisness logic (it dont need to know enythinh about http requests or databases)
Repository: Repository talks to db, you can use different DBs


REST API
Stack used: **Fastify + TypeScript + Drizzle ORM (PostgreSQL)**, 
Architecture layers: `controller -> service -> repository -> db`,
Authentication: JWT (`@fastify/jwt`) + refresh tokens,
Validation: every request and responce is validated by zod,
Error handling,
Auto documentation: Swagger/OpenAPI (`@fastify/swagger` + `@fastify/swagger-ui`).
Tests: every test is in modules/<modulke>/*.test.js (using jast)

## Stack

- **Fastify 5** — express replacement
- **TypeScript** — `NodeNext` moduły (relatywne importy z rozszerzeniem `.js`)
- **Zod** + `fastify-type-provider-zod` — for request validation
- **Drizzle ORM** (`postgres-js` driver) — for db and migrations
- **@fastify/jwt** — auth  Bearer token, hook `fastify.authenticate` 
- **bcryptjs** — password encryption
- **jast** - for unit tests.

## Auth: access token + refresh token

- **Access token** (JWT, podpisany `@fastify/jwt`) — krótki czas życia (`JWT_EXPIRES_IN`, domyślnie `15m`),
  wysyłany jako `Authorization: Bearer <accessToken>`, weryfikowany przez `fastify.authenticate`.
- **Refresh token** (losowy string, `crypto.randomBytes(40).toString("hex")`) — długi czas życia
  (`REFRESH_TOKEN_TTL_DAYS`, domyślnie 30 dni). W bazie (`refresh_tokens`) trzymany jest tylko
  **sha256 hash** tokenu, nigdy wartość jawna — patrz [auth.service.ts](src/modules/auth/auth.service.ts).
- **Rotacja**: każde użycie `POST /api/auth/refresh` unieważnia stary refresh token i wydaje nową parę
  (access + refresh). Próba ponownego użycia już zużytego/unieważnionego tokenu zwraca `401`.
- **Logout**: `POST /api/auth/logout` z `{ refreshToken }` w body unieważnia konkretny token.

Example endpoints:

| Metoda | Ścieżka              | Body                              | Auth |
|--------|----------------------|------------------------------------|------|
| POST   | `/api/auth/register` | `email, password, name`            | -    |
| POST   | `/api/auth/login`    | `email, password`                  | -    |
| POST   | `/api/auth/refresh`  | `refreshToken`                     | -    |
| POST   | `/api/auth/logout`   | `refreshToken`                     | -    |

Typowy flow klienta: zaloguj się raz, trzymaj `refreshToken` (bezpieczne miejsce po stronie klienta),
używaj `accessToken` do zwykłych requestów; gdy dostaniesz `401` (token wygasł), wywołaj `/refresh`
po nową parę tokenów zamiast ponownie prosić użytkownika o hasło.

Nie ma jeszcze mechanizmu czyszczenia wygasłych/unieważnionych wpisów z `refresh_tokens` (np. cron) —
do rozważenia przy skalowaniu.

## Structure

```
src/
  config/env.ts          # walidacja zmiennych środowiskowych (zod)
  db/
    schema.ts             # tabele Drizzle (users, posts)
    client.ts              # instancja drizzle + klient postgres
    migrate.ts              # runner migracji
  plugins/
    db.ts                   # dekoruje fastify.db
    jwt.ts                    # @fastify/jwt + fastify.authenticate
    swagger.ts                  # OpenAPI + Swagger UI (/docs)
    error-handler.ts             # mapowanie błędów (AppError, Zod) na JSON
  common/errors.ts           # AppError, NotFoundError, ConflictError, UnauthorizedError, ForbiddenError
  modules/
    auth/       # register, login (publiczne)
    users/      # /me (chroniony), lista/detale (chronione)
    posts/      # GET publiczne, POST/PATCH/DELETE chronione + sprawdzanie właściciela
  app.ts        # budowa instancji Fastify, rejestracja pluginów i modułów
  server.ts     # start + graceful shutdown
drizzle/          # wygenerowane migracje SQL
drizzle.config.ts  # konfiguracja drizzle-kit
```

Every module have this schema: `*.schema.ts` (zod), `*.repository.ts` (Drizzle/db),
`*.service.ts` (logika biznesowa, rzuca `AppError`), `*.controller.ts` (handlery HTTP),
`*.routes.ts` (rejestracja routów + wiring warstw + schema OpenAPI).
`*.test.ts` (for unit test - using jast).
## Start

```bash
cp .env.example .env   # i uzupełnij JWT_SECRET / DATABASE_URL
npm install
npm run db:migrate     # nakłada migracje z ./drizzle na bazę z DATABASE_URL
npm run dev            # tsx watch, http://localhost:3000
```

Dokumentacja Swagger: `http://localhost:3000/docs`



## Zmiana schematu / migracje

```bash
# 1. edytuj src/db/schema.ts
npm run db:generate   # generuje SQL do ./drizzle na podstawie diffu schematu
npm run db:migrate    # nakłada migracje na bazę
npm run db:studio     # GUI do przeglądania danych (drizzle-kit studio)
```

## Dodawanie nowego modułu (np. "comments")

1. `src/modules/comments/comments.schema.ts` — zod schematy body/params/response
2. `src/modules/comments/comments.repository.ts` — klasa z metodami CRUD na `Database`
3. `src/modules/comments/comments.service.ts` — logika biznesowa, walidacja uprawnień, `AppError`
4. `src/modules/comments/comments.controller.ts` — cienkie handlery wołające service
5. `src/modules/comments/comments.routes.ts` — rejestracja routów + `schema` (dla Swaggera) +
   `onRequest: [fastify.authenticate]` na endpointach wymagających logowania
6. Zarejestruj plugin w `src/app.ts`: `await app.register(commentRoutes, { prefix: "/api/comments" })`

## Znane ograniczenia / do rozważenia później
- Rate limiting
- Cache
- Queue like BullMQ + Redis for delayed operations.
- `drizzle-kit` ma pośrednią (dev-only) podatność moderate w `esbuild` — dotyczy tylko
  lokalnego dev-servera esbuild, nieużywanego w tym projekcie w czasie działania API;
  do przeglądu przy kolejnych podbiciach `drizzle-kit`.
- `zod` jest celowo przypięty na `3.24.4` (a nie najnowszy `3.25.x+`), bo
  `fastify-type-provider-zod@4` nie jest jeszcze kompatybilny ze zbundlowanym
  silnikiem "zod v4" w nowszych wydaniach `zod` 3.25+ (crash przy walidacji).
  Przy przyszłym upgrade `fastify-type-provider-zod` do wersji wspierającej zod v4
  (`>=6`) trzeba podnieść też `zod` do `^4.x` i zaktualizować `overrides`.
