# Authentication and Authorization with Express, PostgreSQL, Drizzle, and JWT

This note explains this project step by step, as if a senior backend engineer is walking you through the ideas and the code.

The project demonstrates:

- User signup
- Password hashing with a salt
- User login
- JWT token generation
- Authentication using JWT
- Authorization using user roles
- Protected user routes
- Admin-only routes
- PostgreSQL storage using Drizzle ORM

---

## 1. Big Picture

Authentication and authorization are related, but they are not the same thing.

### Authentication

Authentication answers:

> Who are you?

Example:

- A user sends email and password.
- The server verifies the credentials.
- If valid, the server gives the user a JWT.

In this project, authentication happens mainly in:

- `POST /user/signup`
- `POST /user/login`
- `authenticationMiddleware`
- `ensureAuthenticated`

### Authorization

Authorization answers:

> What are you allowed to do?

Example:

- A normal user can access their own user route.
- Only an admin can access `/admin/users`.

In this project, authorization happens mainly in:

- `restrictToRole("ADMIN")`
- `routes/admin.routes.js`

---

## 2. Project Structure

```txt
Authentication-Authorization-JWT/
  db/
    index.js
    schema.js
  middlewares/
    auth.middleware.js
  routes/
    user.routes.js
    admin.routes.js
  docker-compose.yml
  drizzle.config.js
  index.js
  package.json
```

### Important files

| File | Purpose |
| --- | --- |
| `index.js` | Starts the Express server and registers global middleware/routes |
| `db/index.js` | Creates the Drizzle database client |
| `db/schema.js` | Defines the PostgreSQL users table |
| `routes/user.routes.js` | Handles signup, login, and user routes |
| `routes/admin.routes.js` | Handles admin-only routes |
| `middlewares/auth.middleware.js` | Handles JWT authentication and role authorization |
| `docker-compose.yml` | Runs PostgreSQL in Docker |
| `drizzle.config.js` | Tells Drizzle where the schema and database are |

---

## 3. Dependencies Used

From `package.json`:

| Package | Purpose |
| --- | --- |
| `express` | Web server framework |
| `dotenv` | Loads environment variables from `.env` |
| `jsonwebtoken` | Creates and verifies JWT tokens |
| `pg` | PostgreSQL driver |
| `drizzle-orm` | ORM/query builder |
| `drizzle-kit` | Database schema push/studio tool |

---

## 4. Environment Variables

The project expects environment variables from `.env`.

Typical values:

```env
PORT=8000
DATABASE_URL=postgres://postgres:mypassword@localhost:5433/postgres
JWT_SECRET=your_long_random_secret_here
```

### Why `JWT_SECRET` matters

`JWT_SECRET` is used to sign and verify tokens.

When logging in:

```js
jwt.sign(payload, process.env.JWT_SECRET)
```

When accessing protected routes:

```js
jwt.verify(token, process.env.JWT_SECRET)
```

If someone knows your JWT secret, they can create fake valid tokens. In real projects, keep it private and strong.

---

## 5. Database Setup

PostgreSQL is configured in `docker-compose.yml`.

```yaml
services:
  db:
    image: postgres:17
    environment:
      POSTGRES_PASSWORD: mypassword
      POSTGRES_USER: postgres
      POSTGRES_DB: postgres
    ports:
      - 5433:5432
```

This means:

- PostgreSQL runs inside Docker on internal port `5432`.
- Your machine connects to it using port `5433`.
- Database name is `postgres`.
- Username is `postgres`.
- Password is `mypassword`.

Start the database:

```bash
docker compose up -d
```

Push the Drizzle schema to PostgreSQL:

```bash
pnpm db:push
```

Open Drizzle Studio if you want to inspect the database visually:

```bash
pnpm db:studio
```

---

## 6. Users Table Schema

Defined in `db/schema.js`:

```js
export const userRoleEnum = pgEnum("user_role", ["USER", "ADMIN"]);

export const usersTable = pgTable("users", {
  id: uuid().primaryKey().defaultRandom(),
  name: varchar({ length: 100 }).notNull(),
  email: varchar({ length: 200 }).notNull().unique(),
  role: userRoleEnum().notNull().default("USER"),
  password: text().notNull(),
  salt: text().notNull(),
});
```

### Column explanation

| Column | Meaning |
| --- | --- |
| `id` | Unique user ID, generated automatically |
| `name` | User's display name |
| `email` | User's email, must be unique |
| `role` | Either `USER` or `ADMIN` |
| `password` | Hashed password, not the raw password |
| `salt` | Random value used while hashing password |

Important rule:

> Never store plain text passwords in the database.

This project stores a hash instead of the original password.

---

## 7. Server Entry Point

Defined in `index.js`:

```js
const app = express();
const PORT = process.env.PORT ?? 8000;

app.use(express.json());
app.use(authenticationMiddleware);

app.get("/", async (req, res) => {
  return res.json({ status: "Server is up and running" });
});

app.use("/user", userRouter);
app.use("/admin", adminRouter);
```

### What happens here?

1. `express()` creates the server.
2. `express.json()` allows Express to read JSON request bodies.
3. `authenticationMiddleware` checks every request for a JWT.
4. `/user` routes are registered.
5. `/admin` routes are registered.

The important design is this:

```js
app.use(authenticationMiddleware);
```

Because this middleware is global, it runs before the user and admin routes.

---

## 8. Signup Flow

Route:

```txt
POST /user/signup
```

Defined in `routes/user.routes.js`.

### Request body

```json
{
  "name": "Ram",
  "email": "ram@example.com",
  "password": "secret123"
}
```

### Step-by-step flow

1. Read `name`, `email`, and `password` from `req.body`.
2. Check if all required fields exist.
3. Check if a user with this email already exists.
4. Generate a random salt.
5. Hash the password using the salt.
6. Store user data in PostgreSQL.
7. Return the new user's ID.

### Code idea

```js
const salt = randomBytes(256).toString("hex");

const hashedPassword = createHmac("sha256", salt)
  .update(password)
  .digest("hex");
```

### Why use a salt?

If two users have the same password, a salt helps produce different hashes.

Example:

```txt
password: hello123
salt A  -> hash A
salt B  -> hash B
```

So even when passwords are equal, stored hashes can be different.

### Signup response

```json
{
  "status": "success",
  "data": {
    "userId": "generated-user-id"
  }
}
```

---

## 9. Login Flow

Route:

```txt
POST /user/login
```

### Request body

```json
{
  "email": "ram@example.com",
  "password": "secret123"
}
```

### Step-by-step flow

1. Read `email` and `password`.
2. Find the user by email.
3. If user does not exist, return an error.
4. Read the stored salt and password hash from the database.
5. Hash the incoming password with the same salt.
6. Compare the new hash with the stored hash.
7. If they match, create a JWT.
8. Return the token.

### Password comparison

```js
const newHash = createHmac("sha256", salt)
  .update(password)
  .digest("hex");

if (newHash !== existingHash) {
  return res.status(400).json({ error: "Incorrect Password!" });
}
```

### JWT payload

```js
const payload = {
  id: existingUser.id,
  email: existingUser.email,
  name: existingUser.name,
  role: existingUser.role,
};
```

The payload is the user information stored inside the token.

### Token generation

```js
const token = jwt.sign(payload, process.env.JWT_SECRET, {
  expiresIn: "1m",
});
```

This creates a JWT that expires in 1 minute.

For learning, 1 minute is useful because you can quickly see token expiration. In real apps, the expiry depends on your security needs.

### Login response

```json
{
  "status": "success",
  "token": "jwt-token-here"
}
```

---

## 10. What Is a JWT?

JWT means JSON Web Token.

A JWT usually has three parts:

```txt
header.payload.signature
```

Example shape:

```txt
xxxxx.yyyyy.zzzzz
```

### Header

The header describes the token type and signing algorithm.

### Payload

The payload contains data, such as:

```json
{
  "id": "user-id",
  "email": "ram@example.com",
  "name": "Ram",
  "role": "USER"
}
```

### Signature

The signature proves the token was created using your server's secret.

Important:

> JWT payload can be decoded by clients. Do not put passwords, secrets, or sensitive private data inside it.

---

## 11. Sending JWT from Client to Server

After login, the client receives a token.

For protected routes, the client sends it in the `Authorization` header:

```txt
Authorization: Bearer <TOKEN>
```

Example using curl:

```bash
curl http://localhost:8000/user \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

The word `Bearer` means:

> I am presenting this token as proof of authentication.

---

## 12. Authentication Middleware

Defined in `middlewares/auth.middleware.js`.

```js
export const authenticationMiddleware = async (req, res, next) => {
  try {
    const tokenHeader = req.headers["authorization"];

    if (!tokenHeader) {
      return next();
    }

    if (!tokenHeader.startsWith("Bearer")) {
      return res
        .status(400)
        .json({ error: "Authorization header must start with Bearer" });
    }

    const token = tokenHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;
    next();
  } catch (error) {
    next();
  }
};
```

### What it does

1. Looks for the `Authorization` header.
2. If no token exists, it lets the request continue.
3. If the header exists but is not a Bearer token, it returns an error.
4. Extracts the JWT.
5. Verifies the JWT using `JWT_SECRET`.
6. Stores decoded user data on `req.user`.
7. Calls `next()` so the request can continue.

### Why attach data to `req.user`?

Once the middleware verifies the token, later route handlers can use:

```js
req.user
```

Example:

```js
req.user.id
req.user.email
req.user.role
```

This avoids verifying the token again inside every route.

---

## 13. Protected Routes

Authentication middleware only reads the token if it exists.

It does not automatically block unauthenticated users.

That job belongs to:

```js
ensureAuthenticated
```

Defined in `middlewares/auth.middleware.js`:

```js
export const ensureAuthenticated = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "you must be authenticated" });
  }

  next();
};
```

### Meaning

If `req.user` does not exist, the user is not logged in.

So this middleware blocks the request with:

```txt
401 Unauthorized
```

### Example protected route

```js
router.get("/", ensureAuthenticated, async (req, res) => {
  return res.json(req.user);
});
```

Request without token:

```json
{
  "error": "you must be authenticated"
}
```

Request with valid token:

```json
{
  "id": "user-id",
  "email": "ram@example.com",
  "name": "Ram",
  "role": "USER"
}
```

---

## 14. Authorization with Roles

Authentication tells us the user is logged in.

Authorization decides if the logged-in user has permission.

Defined in `middlewares/auth.middleware.js`:

```js
export const restrictToRole = (role) => {
  return function (req, res, next) {
    if (req.user.role !== role) {
      return res.status(401).json({
        error: "You are not authorized to access this resource",
      });
    }

    next();
  };
};
```

### How it works

`restrictToRole("ADMIN")` returns a middleware.

That middleware checks:

```js
req.user.role !== "ADMIN"
```

If the user is not an admin, the request is blocked.

---

## 15. Admin Routes

Defined in `routes/admin.routes.js`.

```js
const adminRestrictMiddleware = restrictToRole("ADMIN");

router.use(ensureAuthenticated);
router.use(adminRestrictMiddleware);
```

This means every route in this admin router requires:

1. A valid logged-in user.
2. That user's role must be `ADMIN`.

### Admin route

```txt
GET /admin/users
```

This route returns all users:

```js
const users = await db
  .select({
    id: usersTable.id,
    name: usersTable.name,
    email: usersTable.email,
  })
  .from(usersTable);
```

Notice that the route does not return password or salt. That is good.

Passwords and salts should not be exposed in API responses.

---

## 16. Full Request Flow

### Signup

```txt
Client -> POST /user/signup
Server -> Validate input
Server -> Check duplicate email
Server -> Hash password
Server -> Save user
Server -> Return user ID
```

### Login

```txt
Client -> POST /user/login
Server -> Find user
Server -> Verify password
Server -> Create JWT
Server -> Return JWT
```

### Access protected route

```txt
Client -> GET /user with Authorization header
authenticationMiddleware -> Verify JWT
authenticationMiddleware -> Set req.user
ensureAuthenticated -> Check req.user exists
Route handler -> Return response
```

### Access admin route

```txt
Client -> GET /admin/users with Authorization header
authenticationMiddleware -> Verify JWT
authenticationMiddleware -> Set req.user
ensureAuthenticated -> Check req.user exists
restrictToRole("ADMIN") -> Check role
Route handler -> Return users
```

---

## 17. How to Test the API

Start PostgreSQL:

```bash
docker compose up -d
```

Install dependencies:

```bash
pnpm install
```

Push schema:

```bash
pnpm db:push
```

Start server:

```bash
pnpm dev
```

### 1. Check server

```bash
curl http://localhost:8000/
```

Expected response:

```json
{
  "status": "Server is up and running"
}
```

### 2. Signup

```bash
curl -X POST http://localhost:8000/user/signup \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Ram\",\"email\":\"ram@example.com\",\"password\":\"secret123\"}"
```

### 3. Login

```bash
curl -X POST http://localhost:8000/user/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"ram@example.com\",\"password\":\"secret123\"}"
```

Copy the returned token.

### 4. Access protected user route

```bash
curl http://localhost:8000/user \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 5. Access admin route

```bash
curl http://localhost:8000/admin/users \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

If your user role is `USER`, this should fail because only `ADMIN` can access it.

---

## 18. Important HTTP Status Codes

| Status | Meaning | Example |
| --- | --- | --- |
| `200 OK` | Request succeeded | Login success |
| `201 Created` | Resource created | Signup success |
| `400 Bad Request` | Client sent invalid data | Wrong password or bad header |
| `401 Unauthorized` | User is not authenticated | Missing token |
| `403 Forbidden` | User is authenticated but not allowed | Logged-in user tries admin route |
| `404 Not Found` | Resource not found | User email does not exist |

Small improvement idea:

In this project, role failure currently returns `401`. In production-style APIs, `403 Forbidden` is usually more accurate when the user is logged in but lacks permission.

---

## 19. Beginner Mental Model

Think of the system like this:

```txt
Signup creates an account.
Login proves identity.
JWT remembers identity between requests.
Authentication middleware reads the JWT.
ensureAuthenticated blocks guests.
restrictToRole blocks users without permission.
```

Or shorter:

```txt
Signup -> Login -> Token -> Protected Route -> Role Check
```

---

## 20. Security Notes

### Do not store plain passwords

This project hashes passwords before saving them.

In production, prefer a password hashing library like:

- `bcrypt`
- `argon2`

These are designed specifically for passwords and are safer than a fast general-purpose hash.

### Do not put secrets in JWT payload

Good payload:

```js
{
  id,
  email,
  name,
  role
}
```

Bad payload:

```js
{
  password,
  salt,
  creditCardNumber
}
```

### Use a strong JWT secret

Use a long random value, not something like:

```txt
secret
password
myjwtsecret
```

### Use HTTPS in production

JWTs are bearer tokens. Anyone who steals the token can use it until it expires.

Production apps should send tokens over HTTPS.

### Think carefully about token storage

Common places:

- HTTP-only cookies
- Memory
- Local storage

Each has tradeoffs. For many web apps, HTTP-only secure cookies are a strong choice because JavaScript cannot read them.

---

## 21. Things to Notice in This Codebase

These are useful beginner learning points.

### 1. Middleware parameter typo

In `auth.middleware.js`, the middleware should receive `(req, res, next)`.

Make sure it looks like this:

```js
export const authenticationMiddleware = async (req, res, next) => {
```

If the second parameter is accidentally named something else and the code later uses `res`, the route can crash when handling invalid headers.

### 2. Use `req.user` inside protected routes

In `user.routes.js`, protected routes should use `req.user`.

Example:

```js
router.get("/", ensureAuthenticated, async (req, res) => {
  return res.json(req.user);
});
```

For update:

```js
await db
  .update(usersTable)
  .set({ name })
  .where(eq(usersTable.id, req.user.id));
```

Using `user.id` without defining `user` will cause an error.

### 3. Token expiration is short

The login route uses:

```js
expiresIn: "1m"
```

That means the token expires after 1 minute. Good for demos, but short for normal use.

### 4. Invalid token behavior

The authentication middleware catches token errors and calls `next()`.

That means an invalid token behaves like no token, and protected routes later return:

```txt
401 Unauthorized
```

This is acceptable for a beginner demo. In larger apps, you might return a clearer invalid-token response.

---

## 22. Common Interview Explanation

If someone asks, "How does authentication work in your project?", answer like this:

> The user signs up with name, email, and password. Before saving the password, the server generates a salt and stores a hashed version of the password. During login, the server finds the user by email, hashes the incoming password with the stored salt, and compares it with the stored hash. If it matches, the server signs a JWT containing basic user data like id, email, name, and role. For protected routes, the client sends that token in the Authorization header as a Bearer token. The authentication middleware verifies the token and attaches the decoded user to req.user. Then ensureAuthenticated checks if req.user exists, and restrictToRole checks whether the user has the required role for admin routes.

---

## 23. Final Revision Checklist

Before saying you understand this project, make sure you can explain:

- What signup does
- Why passwords are hashed
- What a salt is
- What login does
- What a JWT contains
- Why JWT needs a secret
- How the client sends a token
- What `authenticationMiddleware` does
- Why `req.user` is useful
- What `ensureAuthenticated` does
- What `restrictToRole` does
- Difference between authentication and authorization
- Why admin routes need both authentication and authorization

---

## 24. One-Line Summary

This project teaches the core backend security flow:

```txt
Store users safely, verify credentials, issue JWTs, authenticate requests, and authorize actions based on roles.
```
