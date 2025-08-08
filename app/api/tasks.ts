import { Router } from "express";
import { checkToken, disallowDisabled } from "../middleware/auth";
import { getFromReq } from "../utils/requests";
import { ISafeUser, User } from "../database/models/user";
import Task, { ITaskForm } from "../database/models/task";
import { getEmbedder } from "../ai/embeddings/embeddings";
import { getLM } from "../ai/lms/lm";
import { Duration } from "surrealdb";

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
    console.error("Error getting tasks: ", error);
    res.status(500).send({
      message: "Internal Server Error",
    });
  }
});

router.get("/range", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).send({
        message: "Unauthorized.",
      });
      return;
    }
    const { startDate, endDate } = req.query as {
      startDate: string;
      endDate: string;
    };
    const tasks = await Task.getForDateRange(user.id, startDate, endDate);

    res.send({
      message: "Tasks retrieved successfully",
      data: tasks,
    });
  } catch (error) {
    console.error("Error getting tasks from range: ", error);
    res.status(500).send({
      message: "Internal Server Error",
    });
  }
});

router.get("/daily", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).send({
        message: "Unauthorized.",
      });
      return;
    }
    const { date } = req.query as { date: string };
    const tasks = await Task.getForDate(user.id, date);

    res.send({
      message: "Tasks retrieved successfully",
      data: tasks,
    });
  } catch (error) {
    console.error("Error getting tasks from range: ", error);
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
    console.error("Error getting task: ", error);
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
      completedAt: null,
    });
    res.send({
      message: "Task created successfully",
      data: task,
    });
  } catch (error) {
    console.error("Error creating task: ", error);
    res.status(500).send({
      message: "Internal Server Error",
    });
  }
});

router.put("/:taskId", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).send({
        message: "Unauthorized.",
      });
      return;
    }
    const taskId = req.params.taskId;
    const hasAccess = await User.checkOwns(user.id, taskId);
    if (!hasAccess) {
      res.status(403).send({
        message: "Unauthorized.",
      });
      return;
    }
    const task = await Task.get(taskId);
    if (!task) {
      res.status(404).send({
        message: "Task not found",
      });
      return;
    }
    let { description, scratchpad, estimatedTime, dueDate, completedAt } =
      req.body;

    let updater: Partial<ITaskForm> = {};
    if (description !== undefined) {
      updater.description = description;
    }
    if (scratchpad !== undefined) {
      updater.scratchpad = scratchpad;
    }
    if (estimatedTime !== undefined) {
      updater.estimatedTime = new Duration(estimatedTime);
    }
    if (dueDate !== undefined) {
      updater.dueDate = dueDate;
    }
    if (completedAt !== undefined) {
      updater.completedAt = completedAt;
    }

    const updatedTask = await Task.update(taskId, updater);
    res.send({
      message: "Task updated successfully",
      data: updatedTask,
    });
  } catch (error) {
    console.error("Error updating task: ", error);
    res.status(500).send({
      message: "Internal Server Error",
    });
  }
});

export default router;
