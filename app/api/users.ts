import { Router } from "express";
import { checkIsSuperuser, checkToken } from "../middlware/auth";
import { ISafeUser, IUser, User } from "../database/models/user";
import { verifyPassword } from "../utils/crypto";
import { getFromReq } from "../utils/middleware";

const router = Router();

router.post("/register", async (req, res) => {
  try {
    const form = req.body;
    if (!form.email || !form.password || !form.password || !form.name) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }
    if (!(form.password !== form.confirmPassword)) {
      res.status(400).json({ message: "Passwords do not match" });
      return;
    }
    const user = await User.create(req.body);
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
    const user = getFromReq<ISafeUser>(req, "user");
    res.json({
      message: "User checked successfully",
      data: user,
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
