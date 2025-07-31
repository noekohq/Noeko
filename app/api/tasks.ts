import { Router } from "express";
import { checkToken, disallowDisabled } from "../middleware/auth";
import { getFromReq } from "../utils/requests";
import { ISafeUser } from "../database/models/user";
import Task from "../database/models/task";
import { getEmbedder } from "../ai/embeddings/embeddings";
import { getLM } from "../ai/lms/lm";

const router = Router();

router.use(checkToken, disallowDisabled);

router.get("/", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).send({
        message: "Unauthorized.",
      });
      return;
    }
    const tasks = await Task.all(user.id);
    res.send({
      message: "Tasks retrieved successfully",
      data: tasks,
    });
  } catch (error) {
    res.status(500).send({
      message: "Internal Server Error",
    });
  }
});

router.get("/:taskId", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).send({
        message: "Unauthorized.",
      });
      return;
    }
    const taskId = req.params.taskId;
    const task = await Task.get(taskId);
    if (!task) {
      res.status(404).send({
        message: "Task not found",
      });
      return;
    }
    res.send({
      message: "Task retrieved successfully",
      data: task,
    });
  } catch (error) {
    res.status(500).send({
      message: "Internal Server Error",
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).send({
        message: "Unauthorized.",
      });
      return;
    }
    let { description, scratchpad, estimatedTime, dueDate } = req.body;
    if (!estimatedTime) {
      res.status(400).send({
        message: "Estimated time is required",
      });
      return;
    }
    if (!dueDate) {
      res.status(400).send({
        message: "Due date is required",
      });
      return;
    }

    const task = await Task.create(user.id, {
      description,
      scratchpad,
      estimatedTime,
      dueDate,
    });
    res.send({
      message: "Task created successfully",
      data: task,
    });
  } catch (error) {
    res.status(500).send({
      message: "Internal Server Error",
    });
  }
});

export default router;
