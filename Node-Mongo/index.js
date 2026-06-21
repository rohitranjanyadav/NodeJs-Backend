import "dotenv/config";
import dns from "node:dns";
import express from "express";
import { connectMongoDB } from "./connection.js";
import userRouter from "./routes/user.routes.js";
import { authMiddleware } from "./middlewares/auth.middleware.js";

const app = express();
const PORT = process.env.PORT ?? 8000;

dns.setServers(["8.8.8.8", "1.1.1.1"]);

if (!process.env.MONGODB_URL) {
  throw new Error("MONGODB_URL is missing from .env");
}

try {
  await connectMongoDB(process.env.MONGODB_URL);
  console.log("MongoDB connected");
} catch (error) {
  console.error("MongoDB connection failed:", error.message);
}

app.use(express.json());
app.use(authMiddleware);

app.use("/user", userRouter);

app.listen(PORT, () => console.log(`Server is running on PORT: ${PORT}`));
