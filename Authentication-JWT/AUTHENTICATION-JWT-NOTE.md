# Production Notes: Authentication and Authorization with Node.js, Express, PostgreSQL, Drizzle, Docker, and JWT

Use this as a professional rebuild and revision guide for an Express authentication system using the stack in this project: Node.js, Express, PostgreSQL, Drizzle ORM, Docker Compose, dotenv, jsonwebtoken, and node:crypto.

This note is auth-first. It explains signup, login, password hashing, JWT authentication, role-based authorization, protected routes, user CRUD, sessions, logout, and production-level backend patterns.

## 1. Authentication vs Authorization

Authentication answers: who are you?

Examples:

- User signs up.
- User logs in with email and password.
- Server verifies the password.
- Server issues a JWT.
- Middleware verifies the JWT on future requests.

Authorization answers: what are you allowed to do?

Examples:

- A logged-in user can view their own profile.
- An admin can list all users.
- A normal user cannot delete another user.

```txt
Authentication = identity
Authorization = permission
```

## 2. High-Level Auth Flow

```txt
Signup
  -> validate input
  -> check duplicate email
  -> hash password with salt
  -> insert user in PostgreSQL
  -> create access token and refresh session

Login
  -> validate credentials
  -> find user by email
  -> verify password hash
  -> create access token and refresh session

Protected request
  -> client sends Authorization: Bearer <access_token>
  -> middleware verifies token
  -> middleware loads user from database
  -> req.user is attached
  -> authorization middleware checks role or ownership
  -> controller runs
```

## 3. Recommended Project Structure

```txt
project-root/
  src/
    config/
      env.js
      database.js
    controllers/
      auth.controller.js
      user.controller.js
    db/
      schema.js
    middlewares/
      async-handler.js
      auth.middleware.js
      error.middleware.js
      validate.middleware.js
    routes/
      auth.routes.js
      user.routes.js
    utils/
      api-error.js
      api-response.js
      password.js
      token.js
  docker-compose.yml
  drizzle.config.js
  index.js
  package.json
  .env
```

Responsibility split:

| File/Folder | Responsibility |
| --- | --- |
| `index.js` | Express app setup and server start |
| `config/env.js` | Validate and export environment variables |
| `config/database.js` | PostgreSQL pool and Drizzle client |
| `db/schema.js` | Tables, enums, indexes, relationships |
| `controllers` | Request business logic |
| `routes` | HTTP endpoints |
| `middlewares` | Auth, authorization, validation, error flow |
| `utils` | Reusable helpers |

## 4. Install Dependencies

```bash
pnpm add express dotenv drizzle-orm pg jsonwebtoken
pnpm add -D drizzle-kit @types/express @types/node @types/pg
```

Recommended `package.json` scripts:

```json
{
  "type": "module",
  "scripts": {
    "dev": "node --watch index.js",
    "start": "node index.js",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  }
}
```

For production password hashing, teams often use `argon2` or `bcrypt`. This note uses Node's built-in `scrypt` from `node:crypto` so it stays close to your current stack while being stronger than simple SHA/HMAC hashing.

## 5. Docker Compose for PostgreSQL

`docker-compose.yml`

```yaml
services:
  db:
    image: postgres:17
    restart: always
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: mypassword
      POSTGRES_DB: postgres
    ports:
      - 5433:5432
    volumes:
      - db_data:/var/lib/postgresql/data

volumes:
  db_data:
```

Commands:

```bash
docker compose up -d
docker compose down
```

`5433:5432` means your app connects to `localhost:5433`, while PostgreSQL inside Docker listens on `5432`.

## 6. Environment Variables

`.env`

```env
NODE_ENV=development
PORT=8000
DATABASE_URL=postgresql://postgres:mypassword@localhost:5433/postgres
JWT_ACCESS_SECRET=replace_with_a_long_random_access_secret
JWT_REFRESH_SECRET=replace_with_a_long_random_refresh_secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

Professional rules:

- Never commit `.env`.
- Use long random JWT secrets.
- Use separate access and refresh token secrets.
- Keep access tokens short-lived.
- Keep refresh tokens revocable through the database.

`src/config/env.js`

```js
import "dotenv/config";

const requiredEnv = ["DATABASE_URL", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 8000),
  databaseUrl: process.env.DATABASE_URL,
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",
};
```

## 7. Database and Drizzle Setup

`src/config/database.js`

```js
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "./env.js";

export const pool = new Pool({
  connectionString: env.databaseUrl,
});

export const db = drizzle(pool);

export async function checkDatabaseConnection() {
  await pool.query("select 1");
}
```

`drizzle.config.js`

```js
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema.js",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
```

Useful commands:

```bash
pnpm db:push
pnpm db:studio
```

## 8. Production-Style Auth Schema

`src/db/schema.js`

```js
import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["USER", "ADMIN"]);

export const usersTable = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 100 }).notNull(),
    email: varchar("email", { length: 200 }).notNull().unique(),
    role: userRoleEnum("role").notNull().default("USER"),
    passwordHash: text("password_hash").notNull(),
    passwordSalt: text("password_salt").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailIdx: index("users_email_idx").on(table.email),
    roleIdx: index("users_role_idx").on(table.role),
  }),
);

export const userSessionsTable = pgTable(
  "user_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    refreshTokenHash: text("refresh_token_hash").notNull(),
    userAgent: text("user_agent"),
    ipAddress: varchar("ip_address", { length: 100 }),
    isRevoked: boolean("is_revoked").notNull().default(false),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("user_sessions_user_id_idx").on(table.userId),
  }),
);
```

Schema decisions:

- `users` stores identity and role.
- Passwords are stored as hash plus salt, never plain text.
- `user_sessions` stores refresh token hashes so refresh tokens can be revoked.
- `isActive` lets admins disable accounts without deleting data.

## 9. Response and Error Utilities

`src/utils/api-response.js`

```js
export function sendSuccess(res, statusCode, message, data = null, meta = null) {
  return res.status(statusCode).json({
    status: "success",
    message,
    data,
    meta,
  });
}
```

`src/utils/api-error.js`

```js
export class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
  }
}
```

`src/middlewares/async-handler.js`

```js
export function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
```

`src/middlewares/error.middleware.js`

```js
export function notFoundHandler(req, res, next) {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

export function errorHandler(error, req, res, next) {
  const statusCode = error.statusCode || 500;
  const isProduction = process.env.NODE_ENV === "production";

  return res.status(statusCode).json({
    status: "error",
    message: statusCode === 500 ? "Internal server error" : error.message,
    details: error.details ?? null,
    stack: isProduction ? undefined : error.stack,
  });
}
```

Why this is professional:

- Controllers can throw errors naturally.
- Every success response has the same shape.
- Every error response has the same shape.
- Stack traces are hidden in production.

## 10. Password Hashing with Node Crypto

Your current project uses `createHmac`. That is okay for a demo, but passwords should be hashed with a deliberately expensive password hashing function. With Node built-ins, use `scrypt`.

`src/utils/password.js`

```js
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const keyLength = 64;

export async function hashPassword(password) {
  const salt = randomBytes(32).toString("hex");
  const derivedKey = await scryptAsync(password, salt, keyLength);

  return {
    passwordHash: derivedKey.toString("hex"),
    passwordSalt: salt,
  };
}

export async function verifyPassword(password, passwordHash, passwordSalt) {
  const derivedKey = await scryptAsync(password, passwordSalt, keyLength);
  const storedKey = Buffer.from(passwordHash, "hex");

  if (storedKey.length !== derivedKey.length) {
    return false;
  }

  return timingSafeEqual(storedKey, derivedKey);
}
```

Rules:

- Never store plain passwords.
- Never return password hashes from an API.
- Use a unique salt per user.
- Use `timingSafeEqual` for hash comparison.

## 11. JWT and Token Utilities

`src/utils/token.js`

```js
import jwt from "jsonwebtoken";
import { createHash } from "node:crypto";
import { env } from "../config/env.js";

export function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    env.jwtAccessSecret,
    { expiresIn: env.jwtAccessExpiresIn },
  );
}

export function signRefreshToken(sessionId) {
  return jwt.sign(
    {
      sid: sessionId,
      tokenType: "refresh",
    },
    env.jwtRefreshSecret,
    { expiresIn: env.jwtRefreshExpiresIn },
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtAccessSecret);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwtRefreshSecret);
}

export function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}
```

Important JWT rules:

- Put the user id in `sub`.
- Put the role in the access token for authorization decisions.
- Do not put passwords, salts, or secrets in JWT payloads.
- Keep access tokens short-lived.
- Store refresh token hashes, not raw refresh tokens.

## 12. Validation Middleware

This version avoids extra dependencies. In larger apps, use `zod`, `joi`, or `valibot`.

`src/middlewares/validate.middleware.js`

```js
import { ApiError } from "../utils/api-error.js";

const emailRegex = /^\S+@\S+\.\S+$/;
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const roles = ["USER", "ADMIN"];

export function validateSignup(req, res, next) {
  const { name, email, password } = req.body;
  const details = [];

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    details.push({ field: "name", message: "Name must contain at least 2 characters" });
  }

  if (!email || typeof email !== "string" || !emailRegex.test(email)) {
    details.push({ field: "email", message: "Email must be valid" });
  }

  if (!password || typeof password !== "string" || password.length < 8) {
    details.push({ field: "password", message: "Password must contain at least 8 characters" });
  }

  if (details.length > 0) {
    return next(new ApiError(400, "Invalid signup data", details));
  }

  req.body.name = name.trim();
  req.body.email = email.trim().toLowerCase();
  next();
}

export function validateLogin(req, res, next) {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new ApiError(400, "Email and password are required"));
  }

  req.body.email = String(email).trim().toLowerCase();
  next();
}

export function validateUserId(req, res, next) {
  if (!uuidRegex.test(req.params.id)) {
    return next(new ApiError(400, "Invalid user id"));
  }

  next();
}

export function validateUpdateUser(req, res, next) {
  const allowedFields = ["name", "email", "role", "isActive"];
  const invalidFields = Object.keys(req.body).filter((field) => !allowedFields.includes(field));

  if (invalidFields.length > 0) {
    return next(new ApiError(400, "Invalid update fields", invalidFields));
  }

  if (req.body.name !== undefined) {
    if (typeof req.body.name !== "string" || req.body.name.trim().length < 2) {
      return next(new ApiError(400, "Name must contain at least 2 characters"));
    }
    req.body.name = req.body.name.trim();
  }

  if (req.body.email !== undefined) {
    if (typeof req.body.email !== "string" || !emailRegex.test(req.body.email)) {
      return next(new ApiError(400, "Email must be valid"));
    }
    req.body.email = req.body.email.trim().toLowerCase();
  }

  if (req.body.role !== undefined && !roles.includes(req.body.role)) {
    return next(new ApiError(400, "Role must be USER or ADMIN"));
  }

  if (req.body.isActive !== undefined && typeof req.body.isActive !== "boolean") {
    return next(new ApiError(400, "isActive must be boolean"));
  }

  if (Object.keys(req.body).length === 0) {
    return next(new ApiError(400, "At least one field is required"));
  }

  next();
}
```

## 13. Authentication and Authorization Middleware

`src/middlewares/auth.middleware.js`

```js
import { eq } from "drizzle-orm";
import { db } from "../config/database.js";
import { usersTable } from "../db/schema.js";
import { ApiError } from "../utils/api-error.js";
import { verifyAccessToken } from "../utils/token.js";
import { asyncHandler } from "./async-handler.js";

export const requireAuth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    throw new ApiError(401, "Authentication token is required");
  }

  const token = authHeader.split(" ")[1];
  const payload = verifyAccessToken(token);

  const [user] = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      role: usersTable.role,
      isActive: usersTable.isActive,
    })
    .from(usersTable)
    .where(eq(usersTable.id, payload.sub))
    .limit(1);

  if (!user || !user.isActive) {
    throw new ApiError(401, "Invalid or inactive user");
  }

  req.user = user;
  next();
});

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, "Authentication is required"));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, "You do not have permission to perform this action"));
    }

    next();
  };
}

export function requireSelfOrRole(...roles) {
  return (req, res, next) => {
    const isSelf = req.user?.id === req.params.id;
    const hasRole = roles.includes(req.user?.role);

    if (!isSelf && !hasRole) {
      return next(new ApiError(403, "You can only access your own resource"));
    }

    next();
  };
}
```

Key ideas:

- `requireAuth` proves identity.
- `requireRole("ADMIN")` checks permission.
- `requireSelfOrRole("ADMIN")` allows either the account owner or an admin.
- Always load the user from the database so disabled users cannot continue using old tokens.

## 14. Auth Controller

`src/controllers/auth.controller.js`

```js
import { and, eq } from "drizzle-orm";
import { db } from "../config/database.js";
import { usersTable, userSessionsTable } from "../db/schema.js";
import { asyncHandler } from "../middlewares/async-handler.js";
import { ApiError } from "../utils/api-error.js";
import { sendSuccess } from "../utils/api-response.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import {
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/token.js";

const publicUserColumns = {
  id: usersTable.id,
  name: usersTable.name,
  email: usersTable.email,
  role: usersTable.role,
  isActive: usersTable.isActive,
  createdAt: usersTable.createdAt,
};

function getRefreshExpiryDate() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date;
}

async function createSessionAndTokens(req, user) {
  const [session] = await db
    .insert(userSessionsTable)
    .values({
      userId: user.id,
      refreshTokenHash: "pending",
      userAgent: req.headers["user-agent"] ?? null,
      ipAddress: req.ip,
      expiresAt: getRefreshExpiryDate(),
    })
    .returning({ id: userSessionsTable.id });

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(session.id);

  await db
    .update(userSessionsTable)
    .set({ refreshTokenHash: hashToken(refreshToken) })
    .where(eq(userSessionsTable.id, session.id));

  return { accessToken, refreshToken };
}

export const signup = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const [existingUser] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (existingUser) {
    throw new ApiError(409, "Email is already registered");
  }

  const { passwordHash, passwordSalt } = await hashPassword(password);

  const [user] = await db
    .insert(usersTable)
    .values({ name, email, passwordHash, passwordSalt })
    .returning(publicUserColumns);

  const tokens = await createSessionAndTokens(req, user);

  sendSuccess(res, 201, "Signup successful", { user, tokens });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const [user] = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      role: usersTable.role,
      passwordHash: usersTable.passwordHash,
      passwordSalt: usersTable.passwordSalt,
      isActive: usersTable.isActive,
    })
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (!user || !user.isActive) {
    throw new ApiError(401, "Invalid email or password");
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash, user.passwordSalt);

  if (!passwordMatches) {
    throw new ApiError(401, "Invalid email or password");
  }

  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
  };

  const tokens = await createSessionAndTokens(req, safeUser);

  sendSuccess(res, 200, "Login successful", { user: safeUser, tokens });
});

export const getMe = asyncHandler(async (req, res) => {
  sendSuccess(res, 200, "Current user fetched successfully", { user: req.user });
});

export const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new ApiError(400, "Refresh token is required");
  }

  const payload = verifyRefreshToken(refreshToken);

  const [session] = await db
    .select({
      id: userSessionsTable.id,
      userId: userSessionsTable.userId,
      refreshTokenHash: userSessionsTable.refreshTokenHash,
      isRevoked: userSessionsTable.isRevoked,
      expiresAt: userSessionsTable.expiresAt,
    })
    .from(userSessionsTable)
    .where(eq(userSessionsTable.id, payload.sid))
    .limit(1);

  if (!session || session.isRevoked || session.refreshTokenHash !== hashToken(refreshToken)) {
    throw new ApiError(401, "Invalid refresh token");
  }

  if (session.expiresAt < new Date()) {
    throw new ApiError(401, "Refresh token has expired");
  }

  const [user] = await db
    .select(publicUserColumns)
    .from(usersTable)
    .where(eq(usersTable.id, session.userId))
    .limit(1);

  if (!user || !user.isActive) {
    throw new ApiError(401, "Invalid or inactive user");
  }

  const accessToken = signAccessToken(user);

  sendSuccess(res, 200, "Token refreshed successfully", { accessToken });
});

export const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new ApiError(400, "Refresh token is required");
  }

  const payload = verifyRefreshToken(refreshToken);

  await db
    .update(userSessionsTable)
    .set({ isRevoked: true })
    .where(eq(userSessionsTable.id, payload.sid));

  sendSuccess(res, 200, "Logout successful");
});

export const logoutAll = asyncHandler(async (req, res) => {
  await db
    .update(userSessionsTable)
    .set({ isRevoked: true })
    .where(and(eq(userSessionsTable.userId, req.user.id), eq(userSessionsTable.isRevoked, false)));

  sendSuccess(res, 200, "Logged out from all sessions");
});
```

Security details:

- Login returns the same error for wrong email and wrong password.
- Password hash and salt are never returned.
- Refresh tokens are stored as hashes.
- Logout revokes the session.
- `getMe` uses `req.user`, which was loaded by auth middleware.

## 15. User Controller with Secure CRUD

User CRUD is part of authorization. Admins can manage users; regular users can view/update their own profile.

`src/controllers/user.controller.js`

```js
import { and, asc, count, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import { db } from "../config/database.js";
import { usersTable } from "../db/schema.js";
import { asyncHandler } from "../middlewares/async-handler.js";
import { ApiError } from "../utils/api-error.js";
import { sendSuccess } from "../utils/api-response.js";

const publicUserColumns = {
  id: usersTable.id,
  name: usersTable.name,
  email: usersTable.email,
  role: usersTable.role,
  isActive: usersTable.isActive,
  createdAt: usersTable.createdAt,
  updatedAt: usersTable.updatedAt,
};

function getPagination(query) {
  const page = Math.max(Number(query.page ?? 1), 1);
  const limit = Math.min(Math.max(Number(query.limit ?? 10), 1), 100);
  return { page, limit, offset: (page - 1) * limit };
}

function getSort(sort) {
  if (sort === "name") return asc(usersTable.name);
  if (sort === "oldest") return asc(usersTable.createdAt);
  return desc(usersTable.createdAt);
}

export const getUsers = asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const search = req.query.search?.trim();
  const role = req.query.role?.trim();

  const filters = [];

  if (search) {
    filters.push(
      or(
        ilike(usersTable.name, `%${search}%`),
        ilike(usersTable.email, `%${search}%`),
      ),
    );
  }

  if (role) {
    filters.push(eq(usersTable.role, role));
  }

  const where = filters.length > 0 ? and(...filters) : undefined;

  const [users, totalRows] = await Promise.all([
    db
      .select(publicUserColumns)
      .from(usersTable)
      .where(where)
      .orderBy(getSort(req.query.sort))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(usersTable).where(where),
  ]);

  const total = Number(totalRows[0]?.total ?? 0);

  sendSuccess(res, 200, "Users fetched successfully", { users }, {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
});

export const getUserById = asyncHandler(async (req, res) => {
  const [user] = await db
    .select(publicUserColumns)
    .from(usersTable)
    .where(eq(usersTable.id, req.params.id))
    .limit(1);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  sendSuccess(res, 200, "User fetched successfully", { user });
});

export const updateUser = asyncHandler(async (req, res) => {
  const allowedFields = ["name", "email", "role", "isActive"];
  const updateData = {};

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  }

  if (req.user.role !== "ADMIN") {
    delete updateData.role;
    delete updateData.isActive;
  }

  if (updateData.email) {
    const [emailOwner] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(and(eq(usersTable.email, updateData.email), ne(usersTable.id, req.params.id)))
      .limit(1);

    if (emailOwner) {
      throw new ApiError(409, "Email is already used by another account");
    }
  }

  updateData.updatedAt = sql`now()`;

  const [user] = await db
    .update(usersTable)
    .set(updateData)
    .where(eq(usersTable.id, req.params.id))
    .returning(publicUserColumns);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  sendSuccess(res, 200, "User updated successfully", { user });
});

export const deactivateUser = asyncHandler(async (req, res) => {
  const [user] = await db
    .update(usersTable)
    .set({ isActive: false, updatedAt: sql`now()` })
    .where(eq(usersTable.id, req.params.id))
    .returning(publicUserColumns);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  sendSuccess(res, 200, "User deactivated successfully", { user });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const [user] = await db
    .delete(usersTable)
    .where(eq(usersTable.id, req.params.id))
    .returning({ id: usersTable.id });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  sendSuccess(res, 200, "User deleted successfully");
});
```

CRUD security rules:

- Normal users can read/update only their own account.
- Admins can list all users.
- Admins can update roles and deactivate users.
- Do not expose password fields in CRUD responses.
- Prefer deactivate/soft delete for real user accounts.

## 16. Auth Routes

`src/routes/auth.routes.js`

```js
import { Router } from "express";
import {
  getMe,
  login,
  logout,
  logoutAll,
  refreshToken,
  signup,
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { validateLogin, validateSignup } from "../middlewares/validate.middleware.js";

const router = Router();

router.post("/signup", validateSignup, signup);
router.post("/login", validateLogin, login);
router.post("/refresh", refreshToken);
router.post("/logout", logout);
router.post("/logout-all", requireAuth, logoutAll);
router.get("/me", requireAuth, getMe);

export default router;
```

| Method | Route | Purpose | Auth required |
| --- | --- | --- | --- |
| `POST` | `/api/auth/signup` | Create account | No |
| `POST` | `/api/auth/login` | Login and receive tokens | No |
| `POST` | `/api/auth/refresh` | Get new access token | Refresh token |
| `POST` | `/api/auth/logout` | Revoke one session | Refresh token |
| `POST` | `/api/auth/logout-all` | Revoke all own sessions | Access token |
| `GET` | `/api/auth/me` | Get current user | Access token |

## 17. User Routes

`src/routes/user.routes.js`

```js
import { Router } from "express";
import {
  deactivateUser,
  deleteUser,
  getUserById,
  getUsers,
  updateUser,
} from "../controllers/user.controller.js";
import { requireAuth, requireRole, requireSelfOrRole } from "../middlewares/auth.middleware.js";
import { validateUpdateUser, validateUserId } from "../middlewares/validate.middleware.js";

const router = Router();

router.use(requireAuth);

router.get("/", requireRole("ADMIN"), getUsers);

router
  .route("/:id")
  .get(validateUserId, requireSelfOrRole("ADMIN"), getUserById)
  .patch(validateUserId, requireSelfOrRole("ADMIN"), validateUpdateUser, updateUser)
  .delete(validateUserId, requireRole("ADMIN"), deleteUser);

router.patch("/:id/deactivate", validateUserId, requireRole("ADMIN"), deactivateUser);

export default router;
```

| Method | Route | Purpose | Permission |
| --- | --- | --- | --- |
| `GET` | `/api/users` | List users | Admin only |
| `GET` | `/api/users/:id` | Get user | Self or admin |
| `PATCH` | `/api/users/:id` | Update user | Self or admin |
| `PATCH` | `/api/users/:id/deactivate` | Disable account | Admin only |
| `DELETE` | `/api/users/:id` | Hard delete user | Admin only |

## 18. Express Server Setup

`index.js`

```js
import express from "express";
import { env } from "./src/config/env.js";
import { checkDatabaseConnection, pool } from "./src/config/database.js";
import authRoutes from "./src/routes/auth.routes.js";
import userRoutes from "./src/routes/user.routes.js";
import { errorHandler, notFoundHandler } from "./src/middlewares/error.middleware.js";

const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Server is healthy",
    uptime: process.uptime(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

await checkDatabaseConnection();

const server = app.listen(env.port, () => {
  console.log(`Server is running on port ${env.port}`);
});

async function shutdown() {
  console.log("Shutting down server...");
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
```

Correct order:

```txt
JSON parser -> health route -> API routes -> 404 handler -> error handler -> listen after database check
```

## 19. Request Examples

Health check:

```bash
curl http://localhost:8000/health
```

Signup:

```bash
curl -X POST http://localhost:8000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Ada Lovelace\",\"email\":\"ada@example.com\",\"password\":\"StrongPass123\"}"
```

Login:

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"ada@example.com\",\"password\":\"StrongPass123\"}"
```

Get current user:

```bash
curl http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Refresh access token:

```bash
curl -X POST http://localhost:8000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"YOUR_REFRESH_TOKEN\"}"
```

Logout current session:

```bash
curl -X POST http://localhost:8000/api/auth/logout \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"YOUR_REFRESH_TOKEN\"}"
```

Logout all sessions:

```bash
curl -X POST http://localhost:8000/api/auth/logout-all \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Admin list users:

```bash
curl "http://localhost:8000/api/users?page=1&limit=10&search=ada" \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"
```

Get one user:

```bash
curl http://localhost:8000/api/users/00000000-0000-4000-8000-000000000000 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Update user:

```bash
curl -X PATCH http://localhost:8000/api/users/00000000-0000-4000-8000-000000000000 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d "{\"name\":\"Ada Byron\"}"
```

Admin deactivate user:

```bash
curl -X PATCH http://localhost:8000/api/users/00000000-0000-4000-8000-000000000000/deactivate \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"
```

Admin delete user:

```bash
curl -X DELETE http://localhost:8000/api/users/00000000-0000-4000-8000-000000000000 \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"
```

## 20. Response Examples

Signup success:

```json
{
  "status": "success",
  "message": "Signup successful",
  "data": {
    "user": {
      "id": "f3f38f0f-8fd5-45e1-9d4b-1766b067f7a1",
      "name": "Ada Lovelace",
      "email": "ada@example.com",
      "role": "USER",
      "isActive": true,
      "createdAt": "2026-06-21T05:00:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOi...",
      "refreshToken": "eyJhbGciOi..."
    }
  },
  "meta": null
}
```

Login failure:

```json
{
  "status": "error",
  "message": "Invalid email or password",
  "details": null
}
```

Forbidden response:

```json
{
  "status": "error",
  "message": "You do not have permission to perform this action",
  "details": null
}
```

Paginated user list:

```json
{
  "status": "success",
  "message": "Users fetched successfully",
  "data": {
    "users": []
  },
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 0,
    "totalPages": 0
  }
}
```

## 21. HTTP Status Codes for Auth APIs

| Status | Meaning | Example |
| --- | --- | --- |
| `200 OK` | Successful request | Login, get profile, update user |
| `201 Created` | Resource created | Signup |
| `400 Bad Request` | Invalid input | Missing password |
| `401 Unauthorized` | Not authenticated | Missing or invalid token |
| `403 Forbidden` | Authenticated but not allowed | User tries admin route |
| `404 Not Found` | Resource missing | User id does not exist |
| `409 Conflict` | Business conflict | Email already exists |
| `500 Internal Server Error` | Unexpected bug | Database or code failure |

Important distinction:

```txt
401 = I do not know who you are
403 = I know who you are, but you are not allowed
```

## 22. Production Security Checklist

- Passwords are never stored as plain text.
- Password hashing uses `scrypt`, `bcrypt`, or `argon2`.
- Password comparison uses a safe comparison method.
- JWT secrets are strong and private.
- Access and refresh token secrets are different.
- Access tokens expire quickly.
- Refresh tokens are revocable.
- Refresh tokens are stored hashed in the database.
- Protected routes use `requireAuth`.
- Admin routes use `requireRole("ADMIN")`.
- Self-owned routes use `requireSelfOrRole("ADMIN")`.
- Disabled users cannot continue using old tokens.
- Password hashes and salts are never returned from APIs.
- Login errors do not reveal whether email or password was wrong.
- Request bodies and params are validated.
- Errors have consistent JSON shape.
- Stack traces are hidden in production.
- Database connection is pooled.
- App starts listening only after database check succeeds.
- Docker Compose is used for local PostgreSQL.

## 23. Common Mistakes and Better Patterns

Bad password hashing:

```js
const hashedPassword = createHmac("sha256", salt).update(password).digest("hex");
```

Better with Node built-ins:

```js
const derivedKey = await scryptAsync(password, salt, 64);
const passwordHash = derivedKey.toString("hex");
```

Bad login error:

```js
return res.status(404).json({ error: `User with email ${email} does not exist` });
```

Better:

```js
throw new ApiError(401, "Invalid email or password");
```

Bad protected route:

```js
router.get("/admin/users", async (req, res) => {
  const users = await db.select().from(usersTable);
  res.json(users);
});
```

Better:

```js
router.get("/admin/users", requireAuth, requireRole("ADMIN"), getUsers);
```

Bad user response:

```js
return res.json(user);
```

Better: select only public fields.

```js
const publicUserColumns = {
  id: usersTable.id,
  name: usersTable.name,
  email: usersTable.email,
  role: usersTable.role,
};
```

## 24. Build Flow From Scratch

```txt
1. Initialize Node project
2. Install Express, Drizzle, pg, dotenv, jsonwebtoken
3. Add Docker Compose for PostgreSQL
4. Add .env with DATABASE_URL and JWT secrets
5. Create Drizzle schema for users and sessions
6. Configure drizzle.config.js
7. Run docker compose up -d
8. Run pnpm db:push
9. Create env and database config modules
10. Create password and token utilities
11. Create auth middleware
12. Create error and response utilities
13. Create auth controller
14. Create user controller
15. Create auth and user routes
16. Register routes in index.js
17. Test signup, login, protected routes, admin routes, logout
```

Useful commands:

```bash
pnpm install
docker compose up -d
pnpm db:push
pnpm db:studio
pnpm dev
```

## 25. Final Interview Explanation

If someone asks how this auth system works, explain it like this:

> The user signs up with name, email, and password. The server validates the input, checks whether the email already exists, hashes the password with a unique salt, and stores only the hash and salt in PostgreSQL through Drizzle. On login, the server finds the user by email, verifies the password using the stored hash and salt, then creates a short-lived access token and a refresh token. The refresh token is tracked through a database session so it can be revoked on logout. Protected routes require the access token in the Authorization header. The authentication middleware verifies the token, loads the user from the database, and attaches the user to req.user. Authorization middleware then checks roles or ownership before allowing actions like listing users, updating accounts, or deleting users.

## 26. One-Line Summary

A production auth API should safely store credentials, issue short-lived identity tokens, revoke sessions when needed, protect routes with middleware, enforce roles and ownership, and return predictable responses without leaking sensitive data.
