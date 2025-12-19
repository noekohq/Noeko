import { Router } from "express";
import { checkToken, disallowDisabled } from "../middleware/auth";
import { getFromReq } from "../utils/requests";
import { IUser } from "../database/models/user";
import { ILogForm, Log } from "../database/models/log";
import { z } from "zod";

const router = Router();

const logSchema = z.object({
  level: z.enum(["info", "warn", "error", "debug", "verbose", "event"]),
  message: z.string(),
  context: z.record(z.any(), z.any()).optional(),
  source: z.string().optional(),
});

router.post("/", checkToken, disallowDisabled, async (req, res) => {
  try {
    const user = await getFromReq<IUser>(req, "user");
    if (!user) {
      // This case should ideally not be reached if checkToken is effective
      res.status(401).send({ message: "Unauthorized" });
      return;
    }

    const validation = logSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        message: "Invalid log format",
        errors: validation.error.issues,
      });
      return;
    }

    const logData: ILogForm = {
      ...validation.data,
      context: {
        ...validation.data.context,
        user: {
          id: user.id,
          email: user.email,
        },
      },
    };

    const log = await Log.create(logData);

    if (log) {
      res.status(201).json(log);
    } else {
      res.status(500).send({ message: "Failed to create log entry." });
    }
  } catch (error) {
    console.error("Error creating log:", error);
    res.status(500).send({ message: "An unexpected error occurred." });
  }
});

export default router;
