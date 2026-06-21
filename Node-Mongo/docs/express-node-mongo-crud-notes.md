# Professional Notes: Node.js, Express, MongoDB, and Complete CRUD

These notes describe how to build a clean Express API with Node.js, MongoDB, and Mongoose. The examples use modern ES modules, route/controller separation, centralized error handling, validation, authentication-aware routes, and production-friendly response patterns.

## 1. Core Stack

- Node.js: JavaScript runtime for the server.
- Express: HTTP server and routing framework.
- MongoDB: NoSQL document database.
- Mongoose: MongoDB object modeling library.
- dotenv: Loads environment variables from `.env`.
- jsonwebtoken: Creates and verifies JWT access tokens.
- bcryptjs or bcrypt: Hashes passwords securely.
- zod or joi: Validates request data.

Recommended install:

```bash
pnpm add express mongoose dotenv jsonwebtoken bcryptjs zod cors helmet morgan
pnpm add -D nodemon
```

Recommended `package.json`:

```json
{
  "type": "module",
  "scripts": {
    "dev": "node --watch index.js",
    "start": "node index.js"
  }
}
```

## 2. Recommended Folder Structure

```text
src/
  config/
    env.js
    database.js
  controllers/
    user.controller.js
  middlewares/
    async-handler.js
    auth.middleware.js
    error.middleware.js
    validate.middleware.js
  models/
    user.model.js
  routes/
    user.routes.js
  utils/
    api-error.js
    api-response.js
index.js
.env
```

For small learning projects, it is fine to keep files at the root. For professional APIs, the structure above scales better.

## 3. Environment Variables

Never hard-code secrets in source code.

```env
NODE_ENV=development
PORT=8000
MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/app_name
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=7d
```

Professional rules:

- Keep `.env` out of Git.
- Rotate exposed database passwords immediately.
- Use separate credentials for development, staging, and production.
- Use strong secrets with at least 32 random characters.

## 4. Environment Config

`src/config/env.js`

```js
import "dotenv/config";

const requiredEnv = ["MONGODB_URL", "JWT_SECRET"];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 8000),
  mongoUrl: process.env.MONGODB_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
};
```

Why this is professional:

- The app fails fast when critical config is missing.
- Other files import config from one place.
- Numeric values are converted once.

## 5. MongoDB Connection

`src/config/database.js`

```js
import mongoose from "mongoose";

export async function connectDatabase(mongoUrl) {
  mongoose.connection.on("connected", () => {
    console.log("MongoDB connected");
  });

  mongoose.connection.on("error", (error) => {
    console.error("MongoDB connection error:", error.message);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected");
  });

  await mongoose.connect(mongoUrl, {
    serverSelectionTimeoutMS: 10000,
  });
}
```

Notes:

- `serverSelectionTimeoutMS` prevents the app from waiting too long when MongoDB is unreachable.
- Connection events make debugging easier.
- Do not call `mongoose.connect()` inside route handlers.

## 6. Express App Setup

`index.js`

```js
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./src/config/env.js";
import { connectDatabase } from "./src/config/database.js";
import userRoutes from "./src/routes/user.routes.js";
import { notFoundHandler, errorHandler } from "./src/middlewares/error.middleware.js";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

if (env.nodeEnv === "development") {
  app.use(morgan("dev"));
}

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Server is healthy",
    uptime: process.uptime(),
  });
});

app.use("/api/users", userRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

await connectDatabase(env.mongoUrl);

app.listen(env.port, () => {
  console.log(`Server is running on port ${env.port}`);
});
```

Professional rules:

- Register JSON middleware before routes.
- Register routes before error middleware.
- Start listening only after the database connection succeeds.
- Add a `/health` route for uptime checks.

## 7. API Error Utility

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

## 8. API Response Utility

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

Why this helps:

- Responses stay consistent.
- Frontend clients know what shape to expect.
- Pagination metadata can be added cleanly.

## 9. Async Handler

`src/middlewares/async-handler.js`

```js
export function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
```

Without this, every async route needs repeated `try/catch` blocks.

## 10. Global Error Middleware

`src/middlewares/error.middleware.js`

```js
import mongoose from "mongoose";

export function notFoundHandler(req, res, next) {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

export function errorHandler(error, req, res, next) {
  let statusCode = error.statusCode || 500;
  let message = error.message || "Internal server error";
  let details = error.details ?? null;

  if (error instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = "Validation failed";
    details = Object.values(error.errors).map((item) => item.message);
  }

  if (error instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = "Invalid resource id";
  }

  if (error.code === 11000) {
    statusCode = 409;
    message = "Duplicate resource";
    details = error.keyValue;
  }

  res.status(statusCode).json({
    status: "error",
    message,
    details,
  });
}
```

Professional rules:

- Never leak stack traces in production API responses.
- Convert database errors into readable HTTP errors.
- Use `409 Conflict` for duplicate unique fields.

## 11. User Model

`src/models/user.model.js`

```js
import { Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must contain at least 2 characters"],
      maxlength: [80, "Name cannot exceed 80 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Email is invalid"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      select: false,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

userSchema.index({ email: 1 }, { unique: true });

userSchema.set("toJSON", {
  transform(doc, ret) {
    delete ret.password;
    return ret;
  },
});

export const User = model("User", userSchema);
```

Senior-level model habits:

- Use `trim`, `lowercase`, `minlength`, and `maxlength`.
- Exclude sensitive fields with `select: false`.
- Avoid returning passwords in JSON.
- Add indexes for frequently queried fields.

## 12. Validation Middleware

`src/middlewares/validate.middleware.js`

```js
import { ApiError } from "../utils/api-error.js";

export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      return next(new ApiError(400, "Invalid request data", details));
    }

    req.validated = result.data;
    next();
  };
}
```

`src/validations/user.validation.js`

```js
import { z } from "zod";

const mongoId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid MongoDB id");

export const createUserSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().email().toLowerCase(),
    password: z.string().min(8).max(72),
  }),
});

export const updateUserSchema = z.object({
  params: z.object({
    id: mongoId,
  }),
  body: z.object({
    name: z.string().trim().min(2).max(80).optional(),
    email: z.string().trim().email().toLowerCase().optional(),
    isActive: z.boolean().optional(),
  }).refine((body) => Object.keys(body).length > 0, {
    message: "At least one field is required",
  }),
});

export const userIdSchema = z.object({
  params: z.object({
    id: mongoId,
  }),
});
```

## 13. Authentication Middleware

`src/middlewares/auth.middleware.js`

```js
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "./async-handler.js";

export const requireAuth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    throw new ApiError(401, "Authentication token is required");
  }

  const token = authHeader.split(" ")[1];
  const payload = jwt.verify(token, env.jwtSecret);

  const user = await User.findById(payload.sub).select("_id name email role isActive");

  if (!user || !user.isActive) {
    throw new ApiError(401, "Invalid or inactive user");
  }

  req.user = user;
  next();
});

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, "You do not have permission to perform this action"));
    }

    next();
  };
}
```

## 14. Complete CRUD Controller

`src/controllers/user.controller.js`

```js
import bcrypt from "bcryptjs";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/api-error.js";
import { sendSuccess } from "../utils/api-response.js";
import { asyncHandler } from "../middlewares/async-handler.js";

export const createUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existingUser = await User.exists({ email });

  if (existingUser) {
    throw new ApiError(409, "Email is already registered");
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
  });

  sendSuccess(res, 201, "User created successfully", { user });
});

export const getUsers = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page ?? 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit ?? 10), 1), 100);
  const skip = (page - 1) * limit;
  const search = req.query.search?.trim();

  const filter = {};

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("_id name email role isActive createdAt updatedAt")
      .lean(),
    User.countDocuments(filter),
  ]);

  sendSuccess(res, 200, "Users fetched successfully", { users }, {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
});

export const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .select("_id name email role isActive createdAt updatedAt")
    .lean();

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  sendSuccess(res, 200, "User fetched successfully", { user });
});

export const updateUser = asyncHandler(async (req, res) => {
  const allowedFields = ["name", "email", "isActive"];
  const updateData = {};

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  }

  if (updateData.email) {
    const emailOwner = await User.exists({
      email: updateData.email,
      _id: { $ne: req.params.id },
    });

    if (emailOwner) {
      throw new ApiError(409, "Email is already used by another account");
    }
  }

  const user = await User.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true,
  }).select("_id name email role isActive createdAt updatedAt");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  sendSuccess(res, 200, "User updated successfully", { user });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  sendSuccess(res, 200, "User deleted successfully");
});
```

CRUD summary:

- Create: `User.create()`
- Read all: `User.find()` with pagination, search, sort
- Read one: `User.findById()`
- Update: `User.findByIdAndUpdate()` with `runValidators: true`
- Delete: `User.findByIdAndDelete()`

## 15. Auth Controller Example

`src/controllers/auth.controller.js`

```js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/api-error.js";
import { sendSuccess } from "../utils/api-response.js";
import { asyncHandler } from "../middlewares/async-handler.js";

function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
    },
    env.jwtSecret,
    {
      expiresIn: env.jwtExpiresIn,
    },
  );
}

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existingUser = await User.exists({ email });

  if (existingUser) {
    throw new ApiError(409, "Email is already registered");
  }

  const user = await User.create({
    name,
    email,
    password: await bcrypt.hash(password, 12),
  });

  const token = signAccessToken(user);

  sendSuccess(res, 201, "Registration successful", {
    token,
    user,
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  const passwordMatches = await bcrypt.compare(password, user.password);

  if (!passwordMatches) {
    throw new ApiError(401, "Invalid email or password");
  }

  const token = signAccessToken(user);

  user.password = undefined;

  sendSuccess(res, 200, "Login successful", {
    token,
    user,
  });
});

export const getMe = asyncHandler(async (req, res) => {
  sendSuccess(res, 200, "Current user fetched successfully", {
    user: req.user,
  });
});
```

Security notes:

- Use `bcrypt.hash(password, 12)` or stronger.
- Use the same error message for wrong email and wrong password.
- Put the user id in JWT `sub`.
- Do not store JWT secrets in code.

## 16. User Routes

`src/routes/user.routes.js`

```js
import { Router } from "express";
import {
  createUser,
  deleteUser,
  getUserById,
  getUsers,
  updateUser,
} from "../controllers/user.controller.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createUserSchema,
  updateUserSchema,
  userIdSchema,
} from "../validations/user.validation.js";

const router = Router();

router
  .route("/")
  .get(requireAuth, requireRole("admin"), getUsers)
  .post(requireAuth, requireRole("admin"), validate(createUserSchema), createUser);

router
  .route("/:id")
  .get(requireAuth, validate(userIdSchema), getUserById)
  .patch(requireAuth, requireRole("admin"), validate(updateUserSchema), updateUser)
  .delete(requireAuth, requireRole("admin"), validate(userIdSchema), deleteUser);

export default router;
```

Route design:

```text
POST   /api/users       Create user
GET    /api/users       List users
GET    /api/users/:id   Get single user
PATCH  /api/users/:id   Update user
DELETE /api/users/:id   Delete user
```

## 17. Auth Routes

`src/routes/auth.routes.js`

```js
import { Router } from "express";
import { getMe, login, register } from "../controllers/auth.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", requireAuth, getMe);

export default router;
```

Register in `index.js`:

```js
import authRoutes from "./src/routes/auth.routes.js";
import userRoutes from "./src/routes/user.routes.js";

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
```

## 18. Request Examples

Create a user:

```bash
curl -X POST http://localhost:8000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "name": "Ada Lovelace",
    "email": "ada@example.com",
    "password": "StrongPass123"
  }'
```

List users:

```bash
curl "http://localhost:8000/api/users?page=1&limit=10&search=ada" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Get one user:

```bash
curl http://localhost:8000/api/users/64b8f2e3c7b1f2a0e3a12345 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Update user:

```bash
curl -X PATCH http://localhost:8000/api/users/64b8f2e3c7b1f2a0e3a12345 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "name": "Ada Byron"
  }'
```

Delete user:

```bash
curl -X DELETE http://localhost:8000/api/users/64b8f2e3c7b1f2a0e3a12345 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

Login:

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ada@example.com",
    "password": "StrongPass123"
  }'
```

## 19. Response Examples

Success:

```json
{
  "status": "success",
  "message": "User fetched successfully",
  "data": {
    "user": {
      "_id": "64b8f2e3c7b1f2a0e3a12345",
      "name": "Ada Lovelace",
      "email": "ada@example.com",
      "role": "user",
      "isActive": true,
      "createdAt": "2026-06-21T05:00:00.000Z",
      "updatedAt": "2026-06-21T05:00:00.000Z"
    }
  },
  "meta": null
}
```

Validation error:

```json
{
  "status": "error",
  "message": "Invalid request data",
  "details": [
    {
      "field": "body.email",
      "message": "Invalid email"
    }
  ]
}
```

Paginated response:

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

## 20. HTTP Status Codes

- `200 OK`: Successful read, update, login, or delete response.
- `201 Created`: Resource created successfully.
- `400 Bad Request`: Invalid input.
- `401 Unauthorized`: Missing or invalid authentication.
- `403 Forbidden`: Authenticated but not allowed.
- `404 Not Found`: Resource does not exist.
- `409 Conflict`: Duplicate resource or business conflict.
- `500 Internal Server Error`: Unexpected server failure.

## 21. Professional CRUD Checklist

- Validate request body, params, and query.
- Use centralized error handling.
- Do not expose passwords, tokens, or stack traces.
- Use `lean()` for read-only list/detail queries when Mongoose document methods are not needed.
- Use `select()` to control returned fields.
- Add pagination to list endpoints.
- Add search and sorting intentionally.
- Use proper status codes.
- Use `runValidators: true` on updates.
- Check duplicate unique fields before update.
- Keep controllers thin and readable.
- Keep authentication and authorization in middleware.
- Use indexes for unique and frequently searched fields.

## 22. Common Mistakes

Bad:

```js
router.get("/users", async (req, res) => {
  const users = await User.find();
  res.json(users);
});
```

Problems:

- No error handling.
- No pagination.
- No field selection.
- Could expose sensitive fields.
- Inconsistent response format.

Better:

```js
router.get("/users", requireAuth, asyncHandler(async (req, res) => {
  const users = await User.find()
    .select("_id name email role createdAt")
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  sendSuccess(res, 200, "Users fetched successfully", { users });
}));
```

## 23. Production Notes

- Add rate limiting for auth routes.
- Add request logging with request ids.
- Use HTTPS in production.
- Configure CORS for trusted origins only.
- Store secrets in the deployment provider's secret manager.
- Use MongoDB Atlas IP access lists carefully.
- Add tests for controllers and routes.
- Add indexes before collections become large.
- Use soft delete when business data must be recoverable.
- Use transactions when updating multiple related collections.

## 24. Soft Delete Example

Instead of permanently deleting users:

```js
export const softDeleteUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true },
  ).select("_id name email isActive");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  sendSuccess(res, 200, "User deactivated successfully", { user });
});
```

Then filter normal lists:

```js
const users = await User.find({ isActive: true }).lean();
```

## 25. Final Senior-Level Pattern

A professional Express + MongoDB API should have:

- One clear app entry point.
- One database connection module.
- Models that protect data integrity.
- Controllers that contain business logic.
- Routes that define HTTP behavior.
- Middleware for authentication, validation, and errors.
- Consistent response shapes.
- Secure password hashing and token handling.
- Pagination, filtering, and field selection for list APIs.

The goal is simple: every endpoint should be predictable, secure, easy to test, and easy for another developer to extend.
