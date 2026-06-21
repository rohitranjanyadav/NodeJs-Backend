import express from "express";
import User from "../models/user.model.js";
import { randomBytes, createHmac } from "node:crypto";
import jwt from "jsonwebtoken";
import { ensureAuthenticated } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.patch("/", ensureAuthenticated, async (req, res) => {
  const { name } = req.body;

  await User.findByIdAndUpdate(req.user._id, {
    name,
  });

  return res.json({ status: "success" });
});

router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ message: "Please fill name, email and password" });
  }

  const existingUser = await User.findOne({
    email,
  });

  if (existingUser) {
    return res.status(401).json({
      error: `User with email ${email} already exists`,
    });
  }

  const salt = randomBytes(256).toString("hex");
  const hashedPassword = createHmac("sha256", salt)
    .update(password)
    .digest("hex");

  const user = await User.insertOne({
    name,
    email,
    password: hashedPassword,
    salt,
  });

  return res.status(201).json({ status: "success", data: { id: user._id } });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Please fill all the fields" });
  }

  const existingUser = await User.findOne({
    email,
  });

  if (!existingUser) {
    return res
      .status(400)
      .json({ error: `User with email ${email} does not exist` });
  }

  const salt = existingUser.salt;
  const hashedPassword = existingUser.password;

  const newHash = createHmac("sha256", salt).update(password).digest("hex");

  if (hashedPassword !== newHash) {
    return res.status(400).json({ error: "Invalid password" });
  }

  const payload = {
    _id: existingUser._id,
    name: existingUser.name,
    email: existingUser.email,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET);

  return res.json({ status: "success", token });
});

export default router;
