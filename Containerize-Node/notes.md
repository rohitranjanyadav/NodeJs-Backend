# Production Ready Docker for Node + Express + Postgres

This note captures the production-oriented setup in this workspace and the exact flow used by the app, Dockerfile, and Compose stack.

## 1. Keep production and development separate

Use `npm start` for containers and reserve `node --watch index.js` for local development.

Current scripts:

```json
{
  "scripts": {
    "start": "node index.js",
    "dev": "node --watch index.js"
  }
}
```

## 2. Use a small production image

The Dockerfile uses `node:20-alpine`, copies only the package manifests first, and installs production dependencies with `npm ci --omit=dev`.

Production Dockerfile pattern:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
EXPOSE 8000

CMD ["npm", "start"]
```

## 3. Wire the app to Postgres

The app reads `DATABASE_URL`, creates a `pg` pool, verifies connectivity on startup, and shuts the pool down on SIGINT or SIGTERM.

Runtime behavior in [index.js](index.js):

- `GET /` returns a basic JSON response.
- `GET /health` returns a lightweight health check.
- `GET /records` reads seeded rows from Postgres.
- startup fails fast if the database is unavailable.

## 4. Seed the database on first boot

The Postgres container mounts [sql/init.sql](sql/init.sql) into `/docker-entrypoint-initdb.d`, which creates the demo table and inserts one row on first initialization.

That keeps the example repeatable without manual SQL steps.

## 5. Orchestrate the stack with Compose

[docker-compose.yml](docker-compose.yml) runs both services on the same network and waits for Postgres health before starting the app.

Key points:

- app is exposed on port 8000
- Postgres is exposed on port 5432 for local access
- data persists in the named volume `postgres_data`
- `depends_on` uses a Postgres healthcheck

## 6. Keep the build context clean

The `.dockerignore` excludes `node_modules`, `.git`, `.env`, and other unnecessary files so builds stay smaller and safer.

## 7. Build and run

Build the app image:

```bash
docker build -t my-app .
```

Run the full stack:

```bash
docker compose up --build
```

Smoke test the app:

```bash
curl http://localhost:8000/health
curl http://localhost:8000/records
```

## 8. Production checklist

Before deploying, confirm the following:

- `DATABASE_URL` is injected at runtime, not baked into the image.
- The app starts with `npm start`, not watch mode.
- Postgres data is persisted in a volume or external managed database.
- The app has a health endpoint and the database has a healthcheck.
- Graceful shutdown closes the database pool.
- Migrations are handled outside the app container lifecycle.

## 9. Files in this setup

- [Dockerfile](Dockerfile)
- [docker-compose.yml](docker-compose.yml)
- [index.js](index.js)
- [db.js](db.js)
- [sql/init.sql](sql/init.sql)
- [.dockerignore](.dockerignore)

This layout is a solid baseline for local development and a production deployment pipeline with minimal changes.

## 10. Cleaner code structure

The database logic now lives in [db.js](db.js), which keeps the entrypoint focused on Express routes and shutdown handling.

That split is useful because:

- the app startup path stays easy to read
- database setup and queries are isolated in one place
- shutdown cleanup is reusable and less error-prone


