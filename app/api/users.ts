import { Router } from "express";
import {
  checkIsSuperuser,
  checkToken,
  disallowDisabled,
} from "../middleware/auth";
import { ISafeUser, IUser, IUserForm, User } from "../database/models/user";
import {
  getRandomPassword,
  hashPassword,
  verifyPassword,
} from "../utils/crypto";
import {
  addAccessTokenToRes,
  addRefreshTokenToRes,
  getFromReq,
  getRefreshTokenFromReq,
} from "../utils/requests";
import { sendEmail } from "../utils/email";
import { getRandomValues } from "crypto";

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
    if (!refreshToken) {
      res.status(500).json({ message: "Internal Server Error" });
      return;
    }
    await addAccessTokenToRes(res, accessToken);
    await addRefreshTokenToRes(res, refreshToken);
    res.json({
      message: "User registered successfully",
      data: {
        accessToken,
        user,
      },
    });
  } catch (error) {
    console.error("User registration error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findByEmail(email, true);
    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }
    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      res.status(401).json({ message: "Incorrect password." });
      return;
    }
    const accessToken = await User.generateAccessToken(user);
    const refreshToken = await User.generateRefreshToken(user);
    if (!refreshToken) {
      res.status(500).json({ message: "Internal Server Error" });
      return;
    }
    await addAccessTokenToRes(res, accessToken);
    await addRefreshTokenToRes(res, refreshToken);
    res.json({
      message: "User logged in successfully",
      data: { accessToken, refreshToken },
    });
  } catch (error) {
    console.error("Login error:", error);
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
    const accessToken = await User.refreshAccessTokens(refreshToken);
    if (!accessToken) {
      res.status(500).json({
        message: "Internal Server Error",
      });
      return;
    }
    await addAccessTokenToRes(res, accessToken);
    await addRefreshTokenToRes(res, refreshToken);

    res.json({
      message: "Token refreshed successfully",
      data: { accessToken },
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/me", checkToken, async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const foundUser = await User.get(user.id);
    if (!foundUser) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.json({
      message: "User checked successfully",
      data: foundUser,
    });
  } catch (error) {
    console.error("User check error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.put("/me", checkToken, async (req, res) => {
  try {
    const user = await getFromReq<IUser>(req, "user");
    if (!user) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    const updater: Partial<IUserForm> = {};
    if (req.body.email && user.email !== req.body.email) {
      const email = req.body.email;
      const emailExists = await User.findByEmail(email);
      if (emailExists) {
        res.status(400).json({ message: "Email already exists." });
        return;
      }
      updater.email = email;
    }
    if (req.body.firstName && user.firstName !== req.body.firstName) {
      updater.firstName = req.body.firstName;
    }
    if (req.body.lastName && user.lastName !== req.body.lastName) {
      updater.lastName = req.body.lastName;
    }
    if (req.body.newPassword) {
      const foundUser = await User.get(user.id, true);
      const valid = await verifyPassword(req.body.password, foundUser.password);
      if (!valid) {
        res.status(400).json({ message: "Invalid password." });
        return;
      }
      if (req.body.newPassword !== req.body.newPasswordConfirmation) {
        res.status(400).json({ message: "Passwords do not match." });
        return;
      }
      const newPassword = await hashPassword(req.body.newPassword);
      updater.password = newPassword;
    }

    const updatedUser = await User.update(user.id, updater);
    const fieldsUpdated = Object.keys(updater);

    res.json({
      message: `User ${fieldsUpdated.join(", ")} updated successfully`,
      data: updatedUser,
    });
  } catch (error) {
    console.error("User update error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post(
  "/invite",
  checkToken,
  disallowDisabled,
  checkIsSuperuser,
  async (req, res) => {
    try {
      const creator = await getFromReq<ISafeUser>(req, "user");
      if (!creator) {
        res.status(401).json({
          message: "Unauthorized.",
        });
        return;
      }
      const form = req.body;
      if (!form.email || !form.firstName || !form.lastName) {
        res.status(400).json({ message: "Missing required fields" });
        return;
      }
      const userExistsWithEmail = await User.findByEmail(form.email);
      if (userExistsWithEmail) {
        res.status(400).json({ message: "Email already in use" });
        return;
      }
      const userPassword = getRandomPassword();
      const hashedPassword = await hashPassword(userPassword);
      const user = await User.create({ ...req.body, password: hashedPassword });
      if (!user) {
        res.status(400).json({ message: "User already exists" });
        return;
      }
      const sentEmail = await User.sendInvitationEmail(
        user,
        creator,
        userPassword,
      );
      res.json({
        message: "User registered successfully",
        data: {
          user,
          emailSuccess: sentEmail,
          newUserPassword: userPassword,
        },
      });
    } catch (error) {
      console.error("User registration error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
);

router.get(
  "/",
  checkToken,
  disallowDisabled,
  checkIsSuperuser,
  async (req, res) => {
    try {
      const users = await User.getAll();
      res.json({
        message: "Users retrieved successfully",
        data: users,
      });
    } catch (error) {
      console.error("User retrieval error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
);

router.get(
  "/:id",
  checkToken,
  disallowDisabled,
  checkIsSuperuser,
  async (req, res) => {
    try {
      const user = await User.get(req.params.id);
      res.json({
        message: "User retrieved successfully",
        data: user,
      });
    } catch (error) {
      console.error("User retrieval error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
);

router.post(
  "/enable/:id",
  checkToken,
  disallowDisabled,
  checkIsSuperuser,
  async (req, res) => {
    try {
      const user = await User.enable(req.params.id);
      res.json({
        message: "User enabled successfully",
        data: user,
      });
    } catch (error) {
      console.error("User enable error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
);

router.post(
  "/disable/:id",
  checkToken,
  disallowDisabled,
  checkIsSuperuser,
  async (req, res) => {
    try {
      const user = await User.disable(req.params.id);
      res.json({
        message: "User disabled successfully",
        data: user,
      });
    } catch (error) {
      console.error("User disable error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
);

router.delete(
  "/:id",
  checkToken,
  disallowDisabled,
  checkIsSuperuser,
  async (req, res) => {
    try {
      const user = await User.delete(req.params.id);
      res.json({
        message: "User disabled successfully",
        data: user,
      });
    } catch (error) {
      console.error("User disable error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
);

router.post(
  "/email/:id",
  checkToken,
  disallowDisabled,
  checkIsSuperuser,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { type } = req.body;
      const sender = await getFromReq<ISafeUser>(req, "user");
      if (!sender) {
        res.status(401).json({
          message: "Unauthorized.",
        });
        return;
      }
      const user = await User.get(id);
      if (!user) {
        res.status(404).json({
          message: "User not found.",
        });
        return;
      }

      if (!type) {
        res.status(400).json({
          message: "Type is required.",
        });
        return;
      }
      if (!["invitation"].includes(type)) {
        res.status(400).json({
          message: `Type ${type} not supported.`,
        });
      }

      if (type === "invitation") {
        const newPassword = getRandomPassword();
        const hashedPassword = await hashPassword(newPassword);
        if (!hashedPassword) {
          throw Error("Something went wrong hashing the users password.");
        }
        await User.update(user.id, { password: hashedPassword });
        const response = await User.sendInvitationEmail(
          user,
          sender,
          newPassword,
        );
        if (response) {
          res.status(200).json({
            message: "Invitation sent successfully.",
            data: true,
          });
          return;
        }
      }
      res.status(500).json({
        message: "Something went wrong.",
        data: false,
      });
    } catch (error) {
      console.error("Error sending email: ", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
);

export default router;
