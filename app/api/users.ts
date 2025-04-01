import { Router } from "express";
import { checkIsSuperuser, checkToken } from "../middlware/auth";
import { User } from "../database/models/user";

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
    res.json({
      message: "User registered successfully",
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
