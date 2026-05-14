const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");
const { ValidationError, ConflictError, UnauthorizedError } = require("../lib/errors");
const SECRET = process.env.JWT_SECRET;

// registering
router.post("/register", async (req, res, next) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      throw new ValidationError("Email, password and name are required");
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) throw new ConflictError("Email already registered");

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name },
    });

    const token = jwt.sign({ userId: user.id }, SECRET, { expiresIn: "1h" });
    res.status(201).json({ message: "User registered successfully", token });
  } catch (error) {
    next(error); // passing error to handler
  }
});

// signing in
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) throw new ValidationError("Email and password are required");
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const token = jwt.sign({ userId: user.id }, SECRET, { expiresIn: "1h" });
    res.json({ token });
  } catch (error) {
    next(error);
  }
});

module.exports = router;