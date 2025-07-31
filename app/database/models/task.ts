import { Duration, RecordId, StringRecordId } from "surrealdb";
import { getDatabase } from "../db";
import { getEmbedder } from "../../ai/embeddings/embeddings";

export type ITask = {
  id: string | RecordId;
  description: string;
  scratchpad: string;
  estimatedTime: Duration;
  dueDate: Date | null;
  embeddings: number[];
  embeddingsUpdatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
};

export type ITaskCreator = Omit<ITask, "id">;

export type ITaskForm = Omit<
  ITaskCreator,
  | "embeddings"
  | "embeddingsUpdatedAt"
  | "createdAt"
  | "updatedAt"
  | "completedAt"
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
            <-owns<-(user WHERE id = <record> $userId);
        RETURN $task;
      }
      `;
    };

    const db = await getDatabase();
    if (!db) {
      throw new Error("Couldn't run task up method");
    }
    await db.query(getTaskRecordFunction());
    await db.query(getUserTasksFunction());
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
      return task;
    } catch (error) {
      console.error("Error creating task: ", error);
      return undefined;
    }
  }

  static async get(taskId: string | RecordId) {
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
}
