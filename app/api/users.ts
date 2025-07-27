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
  clearAuthCookies,
  getFromReq,
  getRefreshTokenFromReq,
} from "../utils/requests";
import { Idea } from "../database/models/ideas";
import { sendEmail } from "../utils/email";
import { logger } from "../services/Logger";

const router = Router();

router.post("/register", async (req, res) => {
  try {
    res.status(403).send({
      message:
        "Sorry, new registration is currently unavailable. Please use a referral link.",
    });
    return;
    // const form = req.body;
    // if (
    //   !form.email ||
    //   !form.password ||
    //   !form.passwordConfirmation ||
    //   !form.firstName ||
    //   !form.lastName
    // ) {
    //   res.status(400).json({ message: "Missing required fields" });
    //   return;
    // }
    // const userExistsWithEmail = await User.findByEmail(form.email);
    // if (userExistsWithEmail) {
    //   res.status(400).json({ message: "Email already in use" });
    //   return;
    // }
    // if (!(form.password === form.passwordConfirmation)) {
    //   res.status(400).json({ message: "Passwords do not match" });
    //   return;
    // }
    // const hashedPassword = await hashPassword(form.password);
    // const user = await User.create({ ...req.body, password: hashedPassword });
    // if (!user) {
    //   res.status(400).json({ message: "User already exists" }); // This might be incorrect, create usually returns the user or throws
    //   return;
    // }
    // const accessToken = await User.generateAccessToken(user);
    // const refreshToken = await User.generateRefreshToken(user);
    // if (!refreshToken) {
    //   res.status(500).json({ message: "Internal Server Error" });
    //   return;
    // }
    // await addAccessTokenToRes(res, accessToken);
    // await addRefreshTokenToRes(res, refreshToken);
    // res.json({
    //   message: "User registered successfully",
    //   data: {
    //     accessToken,
    //     user,
    //   },
    // });
  } catch (error) {
    console.error("User registration error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/register-referred", async (req, res) => {
  try {
    const form = req.body;
    if (
      !form.email ||
      !form.password ||
      !form.passwordConfirmation ||
      !form.firstName ||
      !form.lastName ||
      !form.referralCode
    ) {
      res
        .status(400)
        .json({ message: "Missing required fields, including referralCode" });
      return;
    }

    const isCodeValid = await User.isReferralCodeValid(form.referralCode);
    if (!isCodeValid) {
      res.status(403).json({ message: "Invalid or expired referral code." });
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
    const newUser = await User.create({
      email: form.email,
      password: hashedPassword,
      firstName: form.firstName,
      lastName: form.lastName,
      scratchpadContent: `<h1>Hello and welcome to Qwest!</h1>`,
    });

    if (!newUser) {
      // User.create should throw or return a user. If it returns undefined, it's an issue.
      res.status(500).json({ message: "Failed to create user account." });
      return;
    }

    // Add referral relationship
    const referrerUser = await User.findByReferralCode(form.referralCode);
    if (referrerUser) {
      await User.addReferralRelationship(referrerUser.id, newUser.id);
      console.info(
        `Referral relationship added between ${referrerUser.email} and ${newUser.email}`,
      );
    } else {
      // This case should ideally not happen if isReferralCodeValid passed,
      // but good to log if it does.
      console.warn(
        `Referrer user not found for code ${form.referralCode} after validation.`,
      );
    }

    const accessToken = await User.generateAccessToken(newUser);
    const refreshToken = await User.generateRefreshToken(newUser);

    if (!refreshToken) {
      // This indicates an issue with token generation or saving the refresh token
      await User.delete(newUser.id); // Attempt to rollback user creation
      res
        .status(500)
        .json({ message: "Internal Server Error during token generation" });
      return;
    }

    await addAccessTokenToRes(res, accessToken);
    await addRefreshTokenToRes(res, refreshToken);

    res.status(201).json({
      message: "User registered successfully via referral",
      data: {
        accessToken,
        user: newUser, // newUser is ISafeUser from User.create
      },
    });
  } catch (error) {
    console.error("User registration via referral error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/validate-referral", async (req, res) => {
  try {
    const form = req.body;
    if (!form.referralCode) {
      res.send({
        message: "Referral code is non-existent.",
        data: { valid: false },
      });
      return;
    }

    const isCodeValid = await User.isReferralCodeValid(form.referralCode);
    if (!isCodeValid) {
      res.send({
        message: `Referral code is ${isCodeValid ? false : true}`,
        data: {
          valid: false,
        },
      });
      return;
    }
    const user = await User.findByReferralCode(form.referralCode);
    if (!user) {
      res.send({
        message: `Referral code is ${isCodeValid ? false : true}`,
        data: false,
      });
      return;
    }
    res.send({
      message: `Referral code is ${isCodeValid ? false : true}`,
      data: {
        valid: true,
        user: {
          name: user.firstName,
        },
      },
    });
    return;
  } catch (error) {
    console.error("User registration via referral error:", error);
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
    const { password: _, ...rest } = user;
    console.log("Found user by email: ", rest);
    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      res.status(400).json({ message: "Incorrect password." });
      return;
    }
    const accessToken = await User.generateAccessToken(user);
    if (!accessToken) {
      throw new Error("Failed to generate access token");
    }
    const refreshToken = await User.generateRefreshToken(user);
    if (!refreshToken) {
      throw new Error("Failed to generate refresh token");
    }
    // await addAccessTokenToRes(res, accessToken);
    // await addRefreshTokenToRes(res, refreshToken);
    console.log("Sending back: ", { accessToken, refreshToken });
    res.json({
      message: "User logged in successfully",
      data: { accessToken, refreshToken },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ message: "Email is required" });
      return;
    }

    const user = await User.findByEmail(email);
    if (user) {
      // Generate password reset token
      const resetToken = await User.generatePasswordResetToken(user);
      if (resetToken) {
        // Send password reset email
        await User.sendPasswordResetEmail(user, resetToken);
      }
    }

    // Always return success to prevent email enumeration
    res.json({
      message:
        "If an account with that email exists, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { token, password, passwordConfirmation } = req.body;

    if (!token || !password || !passwordConfirmation) {
      res.status(400).json({
        message: "Token, password, and password confirmation are required",
      });
      return;
    }

    if (password !== passwordConfirmation) {
      res.status(400).json({ message: "Passwords do not match" });
      return;
    }

    const success = await User.resetPasswordWithToken(token, password);
    if (!success) {
      res.status(400).json({ message: "Invalid or expired reset token" });
      return;
    }

    res.json({
      message: "Password has been reset successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error);
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

router.post("/logout", async (req, res) => {
  try {
    const refreshToken = await getRefreshTokenFromReq(req);

    if (refreshToken) {
      // Remove the refresh token from the database
      const logoutSuccess = await User.logout(refreshToken);
      if (!logoutSuccess) {
        console.warn("Failed to remove refresh token during logout");
      }
    }

    // Clear both access and refresh token cookies regardless of database operation
    await clearAuthCookies(res);

    res.json({
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    // Even if there's an error, clear the cookies and return success
    // This ensures the user is logged out on the client side
    await clearAuthCookies(res);
    res.json({
      message: "Logged out successfully",
    });
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
    const userStats = await Idea.getUserIdeaStats(user.id);
    if (!userStats) {
      throw new Error("Something went wrong getting idea stats...");
    }
    res.json({
      message: "User checked successfully",
      data: {
        ...foundUser,
        ...{
          totalIdeas: userStats.total,
        },
      },
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

router.get("/me/scratchpad", checkToken, disallowDisabled, async (req, res) => {
  try {
    const user = await getFromReq<IUser>(req, "user");
    if (!user) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }
    const u = await User.get(user.id.toString());
    res.send({
      message: "Scratchpad updated successfully",
      data: u.scratchpadContent,
    });
  } catch (error) {
    console.error("User scratchpad error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
router.put("/me/scratchpad", checkToken, disallowDisabled, async (req, res) => {
  try {
    const user = await getFromReq<IUser>(req, "user");
    if (!user) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }
    const { content } = req.body;
    const updated = await User.update(user.id.toString(), {
      scratchpadContent: content,
    });
    res.send({
      message: "Scratchpad updated successfully",
      data: updated?.scratchpadContent,
    });
  } catch (error) {
    console.error("User scratchpad error:", error);
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
      const sentEmail = await User.sendInvitationEmail(
        {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
        },
        creator,
      );
      res.json({
        message: "User registered successfully",
        data: {
          user: {
            firstName: form.firstName,
            lastName: form.lastName,
            email: form.email,
          },
          emailSuccess: sentEmail,
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
      if (!["invitation", "test"].includes(type)) {
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
        const response = await User.sendInvitationEmail(user, sender);
        if (response) {
          res.status(200).json({
            message: "Invitation sent successfully.",
            data: true,
          });
          return;
        }
      }

      if (type === "test") {
        const sent = await sendEmail(
          user.email,
          "Test Email",
          "Testing Testing 1, 2, 3. Is this thing on?",
        );
        if (!sent) {
          throw new Error("Error sending email.");
        }
        res.send({ message: "Email sent successfully." });
        return;
      }

      res.status(500).json({
        message: "Something went wrong.",
        data: false,
      });
    } catch (error) {
      logger.error("Error sending email", {
        error,
      });
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
);

export default router;
