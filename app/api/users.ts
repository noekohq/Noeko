import { Router } from "express";
import { checkIsSuperuser, checkToken } from "../middlware/auth";
import { ISafeUser, IUser, User } from "../database/models/user";
import { hashPassword, verifyPassword } from "../utils/crypto";
import {
  addRefreshTokenToRes,
  getFromReq,
  getRefreshTokenFromReq,
} from "../utils/requests";

const router = Router();

router.post("/register", async (req, res) => {
  try {
    const form = req.body;
    if (
      !form.email ||
      !form.password ||
      !form.passwordConfirmation ||
      !form.firstName ||
      !form.lastName
    ) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }
    const userExistsWithEmail = await User.findByEmail(form.email);
    if (userExistsWithEmail) {
      res.status(400).json({ message: "Email already in use" });
      return;
    }
    if (!(form.password === form.passwordConfirmation)) {
      res.status(400).json({ message: "Passwords do not match" });
      return;
    }
    const hashedPassword = await hashPassword(form.password);
    const user = await User.create({ ...req.body, password: hashedPassword });
    if (!user) {
      res.status(400).json({ message: "User already exists" });
      return;
    }
    const accessToken = await User.generateAccessToken(user);
    const refreshToken = await User.generateRefreshToken(user);
    res.json({
      message: "User registered successfully",
      data: {
        accessToken,
        refreshToken,
        user,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findByEmail(email, true);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }
    const token = await User.generateAccessToken(user);
    const refreshToken = await User.generateRefreshToken(user);
    if (!refreshToken) {
      res.status(500).json({ message: "Internal Server Error" });
      return;
    }
    await addRefreshTokenToRes(res, refreshToken);
    res.json({
      message: "User logged in successfully",
      data: { accessToken: token, refreshToken: refreshToken },
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/me", checkToken, async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    res.json({
      message: "User checked successfully",
      data: user,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/refresh", async (req, res) => {
  try {
    const refreshToken = await getRefreshTokenFromReq(req);
    if (!refreshToken) {
      res.status(400).json({ message: "Missing refresh token" });
      return;
    }
    const token = await User.refreshAccessTokens(refreshToken);
    res.json({
      message: "Token refreshed successfully",
      data: { accessToken: token, refreshToken: refreshToken },
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/", checkToken, checkIsSuperuser, async (req, res) => {
  try {
    const users = await User.getAll();
    res.json({
      message: "Users retrieved successfully",
      data: users,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/:id", checkToken, checkIsSuperuser, async (req, res) => {
  try {
    const user = await User.get(req.params.id);
    res.json({
      message: "User retrieved successfully",
      data: user,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export default router;
