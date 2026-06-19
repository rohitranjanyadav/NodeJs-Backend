# Authentication using JWT - Quick Build Note

Use this as a short rebuild checklist for an Express + PostgreSQL + Drizzle + JWT auth project.

## 1) Install dependencies

If starting from scratch:

```bash
pnpm init
pnpm add express dotenv pg drizzle-orm jsonwebtoken
pnpm add -D drizzle-kit @types/express @types/node @types/pg
```

If you already have `package.json`, just run:

```bash
pnpm install
```

## 2) Start PostgreSQL with Docker Compose

Create or update `docker-compose.yml` with PostgreSQL credentials and a port that does not conflict with any local Postgres service.

Run:

```bash
docker compose up -d
```

Use this when you want the database running locally before using Drizzle or the app.

## 3) Set environment variables

Create `.env`:

```env
DATABASE_URL=postgresql://postgres:mypassword@localhost:5433/postgres
JWT_SECRET=your_secret_key
```

Important:
- `DATABASE_URL` must match the port exposed by Docker Compose.
- Keep `JWT_SECRET` stable or JWT verification will fail.

## 4) Define the schema

In `db/schema.js`, keep the auth tables simple:

- `users`
- `user_sessions` if you want session tracking

Typical `users` columns:
- `id`
- `name`
- `email` unique
- `password` hashed
- `salt`

## 5) Configure Drizzle

In `drizzle.config.js`, point Drizzle at the schema and database URL.

Example:

```js
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./db/schema.js",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
```

## 6) Push Drizzle schema to the database

Run this after:
- creating the schema file
- changing table structure
- updating columns or constraints
- switching to a fresh database

Command:

```bash
pnpm drizzle-kit push
```

Use `--force` only when you are intentionally applying schema changes and understand the impact on the database.

## 7) Build the server

In `index.js`:
- load `dotenv`
- create the Express app
- use `express.json()`
- mount the user router
- add JWT middleware for authenticated routes

Basic order:

1. `express.json()`
2. auth middleware to decode `Authorization: Bearer <token>`
3. public routes
4. `app.use("/user", userRouter)`
5. `app.listen(...)`

## 8) Create the auth routes

In `routes/user.routes.js`, usually keep these routes:

- `POST /user/signup`
- `POST /user/login`
- `GET /user` for protected profile access
- `PATCH /user` for protected updates

## 9) Signup flow

Signup should do this in order:

1. Read `name`, `email`, `password` from `req.body`
2. Check if the email already exists
3. Generate a random `salt`
4. Hash the password using `createHmac("sha256", salt)`
5. Insert the user into `users`
6. Return the new `userId`

If signup fails, first check:
- database connection
- `users` table exists
- body parser is enabled
- request sends JSON

## 10) Login flow

Login should do this in order:

1. Read `email` and `password`
2. Find the user by email
3. Recreate the hash with the stored `salt`
4. Compare hashes
5. If valid, create a JWT with `jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1m" })`
6. Return the token

Payload usually includes:
- `id`
- `email`
- `name`

## 11) Protected routes

For protected endpoints:

- read the `Authorization` header
- ensure it starts with `Bearer`
- verify the token with `jwt.verify(token, process.env.JWT_SECRET)`
- set `req.user`
- allow the route to continue

If no token exists, return `401`.

## 12) Common order for rebuilding the project

1. Install packages
2. Start Docker Compose
3. Set `.env`
4. Create schema files
5. Configure Drizzle
6. Run `pnpm drizzle-kit push`
7. Start the server
8. Test signup
9. Test login
10. Test protected route with the token

## 13) Quick test checklist

- `GET /` returns server status
- `POST /user/signup` creates a new user
- `POST /user/login` returns a token
- `GET /user` with Bearer token returns user data
- `PATCH /user` updates the authenticated user

## 14) Useful commands

```bash
pnpm install
pnpm drizzle-kit push
pnpm run dev
pnpm start
docker compose up -d
```

## 15) Common failure points

- wrong `DATABASE_URL`
- Docker port conflict with local Postgres
- `users` table not pushed yet
- missing `express.json()`
- wrong `JWT_SECRET`
- sending form data instead of JSON

## 16) Rebuild summary

When building JWT auth again, follow this exact flow:

- create Express server
- connect PostgreSQL through Docker
- define `users` table in Drizzle
- push schema to DB
- build signup/login with salted password hashing
- sign JWT on login
- verify JWT in middleware for protected routes

That is the core setup you can reuse for most authentication projects.
