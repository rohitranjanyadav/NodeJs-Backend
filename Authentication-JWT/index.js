import express from "express";
import userRouter from "./routes/user.routes.js";
import db from "./db/index.js";
import { userSessions, usersTable } from "./db/schema.js";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";

const app = express();
const PORT = process.env.PORT ?? 8000;

app.use(express.json());
app.use(async function (req, res, next) {
  try {
    const tokenHeader = req.headers["authorization"];

    // Header Authorization: Bearer <TOKEN>

    if (!tokenHeader) {
      return next();
    }

    if (!tokenHeader.startsWith("Bearer")) {
      return res
        .status(400)
        .json({ error: "authorization header must start with Bearer" });
    }

    // Extract token
    const token = tokenHeader.split(" ")[1];

    // Extract the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;
    next();
  } catch (error) {
    next();
  }
});

app.get("/", async (req, res) => {
  return res.json({ status: "Server is up and running" });
});

app.use("/user", userRouter);

app.listen(PORT, () => console.log(`Server is running on PORT: ${PORT}`));
