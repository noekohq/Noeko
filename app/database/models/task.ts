import { Duration, RecordId, StringRecordId } from "surrealdb";
import { getDatabase } from "../db";
import { getEmbedder } from "../../ai/embeddings/embeddings";
import { htmlToMarkdown } from "../../utils/formatting";
import { Idea, IIdea, IIdeaDerived } from "./ideas";
import { Search } from "../../services/Search";

export type ITask = {
  id: string | RecordId;
  description: string;
  scratchpad: string;
  estimatedTime: Duration;
  dueDate: string | null;
  embeddings: number[];
  embeddingsUpdatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
};

export type IPublicTask = Omit<ITask, "embeddings">;

export type ITaskCreator = Omit<ITask, "id">;

export type ITaskForm = Omit<
  ITaskCreator,
  "embeddings" | "embeddingsUpdatedAt" | "createdAt" | "updatedAt"
>;

export default class Task {
  constructor() {}

  static async up() {
    const getTaskRecordFunction = () => {
      return `
      DEFINE FUNCTION OVERWRITE fn::get_task_record(
        $taskId: record<task>
      ) {
        LET $task =
          SELECT
            *
          OMIT embeddings
          FROM ONLY
            <record> $taskId;
        RETURN $task;
      }
      `;
    };

    const getFullTaskRecordFunction = () => {
      return `
      DEFINE FUNCTION OVERWRITE fn::get_full_task_record(
        $taskId: record<task>
      ) {
        LET $task =
          SELECT
            *
          FROM ONLY
            <record> $taskId;
        RETURN $task;
      }
      `;
    };

    const getUserTasksFunction = () => {
      return `
      DEFINE FUNCTION OVERWRITE fn::get_user_tasks(
        $userId: record<user>
      ) {
        LET $tasks =
          SELECT
            *
          OMIT embeddings
          FROM task
          WHERE
            <-owns<-(user WHERE id = <record> $userId) AND
            (completedAt = NONE OR completedAt = NULL);
        RETURN $tasks;
      }
      `;
    };

    const getUserTasksForDateRangeFunction = () => {
      return `
          DEFINE FUNCTION OVERWRITE fn::get_user_tasks_for_date_range(
            $userId: record<user>,
            $startDate: string,
            $endDate: string
          ) {
            LET $tasks =
              SELECT
                *
              OMIT embeddings
              FROM task
              WHERE
                <-owns<-(user WHERE id = <record> $userId) AND
                (dueDate >= $startDate AND dueDate <= $endDate) AND
                (completedAt = NONE OR completedAt = NULL);
            RETURN $tasks;
          }
          `;
    };

    const db = await getDatabase();
    if (!db) {
      throw new Error("Couldn't run task up method");
    }
    await db.query(getTaskRecordFunction());
    await db.query(getFullTaskRecordFunction());
    await db.query(getUserTasksFunction());
    await db.query(getUserTasksForDateRangeFunction());
  }

  static async create(userId: string | RecordId, form: ITaskForm) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Couldn't get database");
      }
      const result = await db.create<ITask, ITaskCreator>("task", {
        ...form,
        embeddings: await getEmbedder().getEmptyEmbeddings(),
        embeddingsUpdatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
      });
      if (!result) {
        throw new Error("Couldn't create task");
      }
      const [task] = result;
      if (!task) {
        throw new Error("Task is falsey");
      }
      await db.query(
        `RELATE $user->owns->$task CONTENT { createdAt: time::now() };`,
        { user: new StringRecordId(userId), task: new StringRecordId(task.id) },
      );
      this.loadEmbedding(task.id);
      return task;
    } catch (error) {
      console.error("Error creating task: ", error);
      return undefined;
    }
  }

  static async get(taskId: string | RecordId, safety?: "full"): Promise<ITask>;
  static async get(
    taskId: string | RecordId,
    safety?: "public",
  ): Promise<IPublicTask>;
  static async get(
    taskId: string | RecordId,
    safety: "public" | "full" = "public",
  ): Promise<ITask | IPublicTask | undefined> {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Couldn't get database");
      }
      const fn =
        safety === "public"
          ? "fn::get_task_record"
          : "fn::get_full_task_record";
      const task = await db.run<ITask>(fn, [new StringRecordId(taskId)]);
      if (!task) {
        throw new Error("Task is falsey");
      }
      return task;
    } catch (error) {
      console.error("Error getting task: ", error);
      return undefined;
    }
  }

  static async all(userId: string | RecordId) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Couldn't get database");
      }
      const tasks = await db.run<ITask[]>(`fn::get_user_tasks`, [
        new StringRecordId(userId),
      ]);
      if (!tasks) {
        throw new Error("Tasks are falsey");
      }
      return tasks;
    } catch (error) {
      console.error("Error getting tasks: ", error);
      return undefined;
    }
  }

  static async delete(taskId: string | RecordId) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Couldn't get database");
      }
      const task = await db.run<ITask>(`fn::get_task_record`, [
        new StringRecordId(taskId),
      ]);
      if (!task) {
        throw new Error("Task is falsey");
      }
      await db.query(`DELETE $task`, {
        task: new StringRecordId(taskId),
      });
      return task;
    } catch (error) {
      console.error("Error deleting task: ", error);
      return undefined;
    }
  }

  static async update(taskId: string | RecordId, updater: Partial<ITask>) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Couldn't get database");
      }
      const task = await db.run<ITask>(`fn::get_task_record`, [
        new StringRecordId(taskId),
      ]);
      if (!task) {
        throw new Error("Task does not exist");
      }
      await db.merge(new StringRecordId(taskId), {
        ...updater,
      });
      return task;
    } catch (error) {
      console.error("Error completing task: ", error);
      return undefined;
    }
  }

  static async complete(taskId: string | RecordId) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Couldn't get database");
      }
      const task = await db.run<ITask>(`fn::get_task_record`, [
        new StringRecordId(taskId),
      ]);
      if (!task) {
        throw new Error("Task is falsey");
      }
      await db.merge(new StringRecordId(taskId), {
        completedAt: new Date(),
      });
      return task;
    } catch (error) {
      console.error("Error completing task: ", error);
      return undefined;
    }
  }

  static async loadEmbedding(taskId: string | RecordId) {
    try {
      const task = await this.get(taskId);
      if (!task) {
        throw new Error("Could not get non-existent task");
      }
      const { description, scratchpad } = task;
      const embeddableScratchpad = htmlToMarkdown(scratchpad);

      const embeddableContent = `
        ${description}
        ---

        ${embeddableScratchpad}
      `;

      const e = getEmbedder();
      const embedding = await e.embedContent(embeddableContent);
      if (!embedding) {
        throw new Error("Could not get embedding vector");
      }
      const updated = await this.update(taskId, {
        embeddings: embedding,
      });
      return updated;
    } catch (error) {
      console.error("Error loading embedding: ", error);
      return false;
    }
  }

  static async getForDateRange(
    userId: string | RecordId,
    startDate: string,
    endDate: string,
  ) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Couldn't get database");
      }
      const tasks = await db.run<ITask[]>(`fn::get_user_tasks_for_date_range`, [
        new StringRecordId(userId),
        startDate,
        endDate,
      ]);
      if (!tasks) {
        throw new Error("Tasks are falsey");
      }
      return tasks;
    } catch (error) {
      console.error("Error getting tasks for date range: ", error);
      return undefined;
    }
  }

  static async getForDate(userId: string | RecordId, date: string) {
    return this.getForDateRange(userId, date, date);
  }

  static async getSimilarIdeasToTask(
    taskId: string | RecordId,
    userId: string | RecordId,
    options?: {
      limit?: number;
      threshold?: number;
    },
  ): Promise<IIdea[] | undefined> {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Error getting database");
      }
      const task = await Task.get(taskId);
      if (!task) {
        throw new Error(`Task with id ${taskId.toString()} not found.`);
      }
      if (!task.embeddings || task.embeddings.length === 0) {
        console.warn(`Task with id ${taskId.toString()} has no embeddings.`);
        return [];
      }

      const results = await db.run<(IIdea & { derivedList: IIdeaDerived[] })[]>(
        "fn::search_ideas_similar_to_task",
        [new StringRecordId(taskId), new StringRecordId(userId)],
      );

      if (!results) {
        console.warn(
          `No similar ideas found for task ${taskId.toString()} for user ${userId.toString()}.`,
        );
        return [];
      }

      const withDerived = results.map((idea) => {
        return {
          ...idea,
          derived: Idea.mapDerived(idea.derivedList),
        } as IIdea;
      });

      const final = withDerived;

      return final;
    } catch (error) {
      console.error(
        `Error getting similar ideas for task ${taskId.toString()}: `,
        error,
      );
      return undefined;
    }
  }
}
