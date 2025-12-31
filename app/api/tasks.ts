import { Router } from "express";
import { checkToken, disallowDisabled } from "../middleware/auth";
import { getFromReq } from "../utils/requests";
import { ISafeUser, User } from "../database/models/user";
import Task, {
  ITask,
  ITaskDurationBehavior,
  ITaskForm,
  ITaskQuery,
} from "../database/models/task";
import { Duration } from "surrealdb";
import { getLM } from "../ai/lms/lm";
import { LMSchemaType } from "../ai/lms";
import { PromptBuilder } from "../ai/lms/utils";
import { getFormattedDateTimeToday } from "../utils/prompts/components";

import Authorization from "../services/Authorization";
import { IShareAccess } from "../database/models/share";

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
    const sortField = req.query.sortField as string;
    const sortDirection = req.query.sortDirection as string;
    const limit = req.query.limit as string;
    const start = req.query.start as string;
    const startDate = req.query.dateStart as string;
    const endDate = req.query.dateEnd as string;
    const duration = req.query.duration as string;
    const durationBehavior = req.query.durationBehavior as string;

    if (
      sortField &&
      !["createdAt", "updatedAt", "viewedAt", "dueDate"].includes(sortField)
    ) {
      res.status(400).send({
        message: "Sort field must be createdAt, updatedAt, or viewedAt",
      });
      return;
    }
    if (sortDirection && !["asc", "desc"].includes(sortDirection)) {
      res.status(400).send({
        message: "Sort direction must be asc or desc",
      });
      return;
    }
    if (limit && isNaN(Number(limit))) {
      res.status(400).send({
        message: "Limit must be a number",
      });
      return;
    }
    if (start && isNaN(Number(start))) {
      res.status(400).send({
        message: "Start must be a number",
      });
      return;
    }
    if (startDate && !new Date(startDate)) {
      res.status(400).send({
        message: "Start date must be a valid date",
      });
      return;
    }
    if (endDate && !new Date(endDate)) {
      res.status(400).send({
        message: "End date must be a valid date",
      });
      return;
    }
    if (duration && !new Duration(duration)) {
      res.status(400).send({
        message: "Duration must be a valid duration",
      });
      return;
    }
    if (
      durationBehavior &&
      ![
        "over",
        "over-inclusive",
        "under",
        "under-inclusive",
        "equals",
      ].includes(durationBehavior)
    ) {
      res.status(400).send({
        message:
          "Duration behavior must be one of 'over', 'over-inclusive', 'under', 'under-inclusive', or 'equals'",
      });
      return;
    }

    const parsedLimit = limit ? Number(limit) : undefined;
    const parsedStart = start ? Number(start) : undefined;

    const options: ITaskQuery = {
      sort:
        sortField && sortDirection
          ? ({
              field: sortField,
              direction: sortDirection,
            } as ITaskQuery["sort"])
          : undefined,
      limit: parsedLimit,
      start: parsedStart,
      dateRange: {
        start: startDate ?? undefined,
        end: endDate ?? undefined,
      },
      duration:
        duration && durationBehavior
          ? {
              value: duration,
              behavior: durationBehavior as ITaskDurationBehavior,
            }
          : undefined,
    };
    const tasks = await Task.getUserTasks(user.id, options);
    if (!tasks) {
      res.status(404).json({ error: "User tasks not found" });
      return;
    }
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
    const accessLevel = await Authorization.getAccessLevel(user.id, taskId);

    if (!accessLevel) {
      res.status(403).send({
        message: "Unauthorized.",
      });
      return;
    }

    if (accessLevel === "owner") {
      Task.update(task.id, {
        viewedAt: new Date(),
      });
    }

    const toSend: ITask & { accessLevel: "owner" | IShareAccess | null } = {
      ...task,
      accessLevel,
    };

    res.send({
      message: "Task retrieved successfully",
      data: toSend,
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
    let { description, scratchpad, estimatedTime, dueDate, auto } = req.body;
    const creator: ITaskForm = {
      description,
      scratchpad,
      estimatedTime,
      dueDate,
      completedAt: null,
    };
    const lm = getLM().withModel("simple");
    if (!creator.description && !auto) {
      res.status(400).send({
        message: "No description provided.",
      });
      return;
    }
    if (!creator.description && !!creator.scratchpad && auto) {
      const d = await lm.utils.entitle(
        "A brief, concise, action-oriented description of the following rough task explanation.",
        creator.scratchpad,
      );
      if (d) {
        creator.description = d;
      } else {
        res.status(400).send({
          message: "No description provided and failed to generate.",
        });
        return;
      }
    }
    if (!creator.estimatedTime && auto) {
      const prompt = new PromptBuilder();
      prompt.addBlock(
        "Instructions",
        `Estimate the amount of time that it would take to complete the following task based on the description and scratch content associated:`,
      );
      prompt.addBlock(
        "Description",
        `The task description is: <taskDescription>${description}</taskDescription>`,
      );
      prompt.addBlock(
        "Scratch",
        `The task's scratch content is: <scratchContent>${scratchpad}</scratchContent>`,
      );
      const et = await lm.generateJSON<string>(prompt.get(), {
        type: LMSchemaType.STRING,
        enum: ["15m", "30m", "1h", "2hrs", "4hrs", "8hr"],
        description:
          "The closest estimated amount of time it would take to complete the task",
      });
      if (et) {
        creator.estimatedTime = new Duration(et);
      }
    }
    if (
      !creator.dueDate &&
      (!!creator.description || !!creator.scratchpad) &&
      auto
    ) {
      const prompt = new PromptBuilder();
      prompt.addBlock(
        "Instructions",
        `Extract the due date for the following task based on the description and scratch content associated.`,
      );
      prompt.addBlock(
        "RULES",
        "DO NOT return a due-date if none is specified or strongly implied",
      );
      prompt.addBlock(
        "Context",
        `The current date and time are: ${getFormattedDateTimeToday()}`,
      );
      prompt.addBlock(
        "Description",
        `The task description is: <taskDescription>${description}</taskDescription>`,
      );
      prompt.addBlock(
        "Scratch",
        `The task's scratch content is: <scratchContent>${scratchpad}</scratchContent>`,
      );
      const dd = await lm.generateJSON<string>(prompt.get(), {
        type: LMSchemaType.STRING,
        description:
          "An ISO string containing the estimated due date. LEAVE EMPTY if no due date can be accurately derived.",
      });
      if (dd) {
        const parsedDate = new Date(dd);
        creator.dueDate = parsedDate.toISOString();
      }
    }

    const task = await Task.create(user.id, {
      ...creator,
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
    const auth = new Authorization(user.id);
    const hasAccess = await auth.hasAccess(taskId, "editor");
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

router.delete("/:taskId", async (req, res) => {
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

    const deletedTask = await Task.delete(taskId);
    res.send({ message: "Successfully deleted task", data: deletedTask });
  } catch (error) {
    console.error("Error deleting task: ", error);
    res.status(500).send({
      message: "Something went wrong.",
    });
  }
});

router.get("/:taskId/similar-ideas", async (req, res): Promise<void> => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user || !user.id) {
      res.status(401).json({ message: "Unauthorized. User not found." });
      return;
    }

    const { taskId } = req.params;
    const { limit, threshold } = req.query;

    let parsedLimit: number | undefined = undefined;
    if (limit) {
      parsedLimit = parseInt(limit as string, 10);
      if (isNaN(parsedLimit) || parsedLimit <= 0) {
        res.status(400).json({
          message: "Invalid limit parameter. Must be a positive integer.",
        });
        return;
      }
    }

    let parsedThreshold: number | undefined = undefined;
    if (threshold) {
      parsedThreshold = parseFloat(threshold as string);
      if (
        isNaN(parsedThreshold) ||
        parsedThreshold < 0 ||
        parsedThreshold > 1
      ) {
        res.status(400).json({
          message:
            "Invalid threshold parameter. Must be a float between 0 and 1.",
        });
        return;
      }
    }

    const isOwner = await User.checkOwns(user.id, taskId);
    if (!isOwner) {
      res.status(403).json({ message: "Unauthorized." });
      return;
    }

    const taskExists = await Task.get(taskId);
    if (!taskExists) {
      res.status(404).json({ message: "Task not found." });
      return;
    }
    if (!taskExists.embeddings || taskExists.embeddings.length === 0) {
      res.status(200).json({
        message: "Tag has no embeddings to compare, no similar ideas found.",
        data: [],
      });
      return;
    }

    const options = {
      limit: parsedLimit,
      threshold: parsedThreshold,
    };

    const similarIdeas = await Task.getSimilarIdeasToTask(
      taskId,
      user.id,
      options,
    );

    if (similarIdeas === undefined) {
      res
        .status(500)
        .json({ message: "Error fetching similar ideas for the task." });
      return;
    }

    res.status(200).json({
      message: "Successfully retrieved similar ideas for the task.",
      data: similarIdeas,
    });
  } catch (error) {
    console.error(
      `Error getting similar ideas for task ${req.params.taskId}:`,
      error,
    );
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export default router;
