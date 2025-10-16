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
  viewedAt: Date;
  completedAt: Date | null;
};

export type IPublicTask = Omit<ITask, "embeddings">;

export type ITaskCreator = Omit<ITask, "id">;

export type ITaskForm = Omit<
  ITaskCreator,
  "embeddings" | "embeddingsUpdatedAt" | "createdAt" | "updatedAt" | "viewedAt"
>;

export type ITaskSortFields =
  | "createdAt"
  | "updatedAt"
  | "completedAt"
  | "viewedAt"
  | "dueDate";

export type ITaskSortDirection = "desc" | "asc";

export type ITaskDurationBehavior =
  | "under"
  | "under-inclusive"
  | "over"
  | "over-inclusive"
  | "equals";

export type ITaskQuery = Partial<{
  sort?: {
    field: ITaskSortFields;
    direction: ITaskSortDirection;
  };
  duration?: {
    value: string;
    behavior: ITaskDurationBehavior;
  };
  dateRange?: {
    start?: string;
    end?: string;
  };
  limit?: number;
  start?: number;
}>;

export default class Task {
  constructor() {}

  static async getUserTasks(
    userId: string,
    options?: ITaskQuery,
  ): Promise<IPublicTask[] | undefined> {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Database not available");
      }

      const builder = new TaskQueryBuilder().ownedBy(userId);

      builder.onlyIncomplete();
      builder.withDuration(options?.duration);
      builder.dateRange(options?.dateRange);

      if (options?.sort) {
        builder.sortBy(options.sort.field, options.sort.direction);
      } else {
        builder.sortBy("dueDate", "desc"); // Default sort
      }

      builder.paginate({
        start: options?.start,
        limit: options?.limit ?? 50,
      });

      const { query, params } = builder.build();

      const results = await db.query<[IPublicTask[]]>(query, params);

      if (!results) {
        console.error("Something went wrong, no results found.");
        return undefined;
      }
      const [tasks] = results;
      return tasks;
    } catch (err) {
      console.error("Something went wrong getting user tasks", err);
      return undefined;
    }
  }

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
                (dueDate >= $startDate AND dueDate <= $endDate);
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

    function taskIndexes() {
      return `
      DEFINE INDEX IF NOT EXISTS idx_task_completed_at ON TABLE task FIELDS completedAt;
      `;
    }

    await db.query(taskIndexes());
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
        viewedAt: new Date(),
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

export class TaskQueryBuilder {
  private whereClauses: string[] = [];
  private params: Record<string, any> = {};
  private sortClause: string = "";
  private paginationClause: string = "";

  constructor() {}

  public ownedBy(userId: string | RecordId): this {
    this.whereClauses.push(`<-owns<-(user WHERE id = $userId)`);
    this.params.userId = new StringRecordId(userId);
    return this;
  }

  public sortBy(
    field: ITaskSortFields,
    direction: "desc" | "asc" = "desc",
  ): this {
    this.sortClause = `ORDER BY ${field} ${direction}`;
    return this;
  }

  public paginate(options: { start?: number; limit?: number }): this {
    if (options.limit) {
      this.paginationClause += ` LIMIT ${options.limit}`;
    }
    if (options.start) {
      this.paginationClause += ` START ${options.start}`;
    }
    return this;
  }

  public onlyIncomplete(): this {
    this.whereClauses.push(`completedAt = NULL`);
    return this;
  }

  public withDuration(duration: ITaskQuery["duration"]) {
    if (!duration || !duration.value || !duration.behavior) {
      return this;
    }
    const { behavior, value } = duration;
    switch (behavior) {
      case "equals":
        this.whereClauses.push(
          `<duration> estimatedTime = <duration> $duration`,
        );
        break;
      case "under":
        this.whereClauses.push(
          `<duration> estimatedTime < <duration> $duration`,
        );
        break;
      case "under-inclusive":
        this.whereClauses.push(
          `<duration> estimatedTime <= <duration> $duration`,
        );
        break;
      case "over":
        this.whereClauses.push(
          `<duration> estimatedTime > <duration> $duration`,
        );
        break;
      case "over-inclusive":
        this.whereClauses.push(
          `<duration> estimatedTime >= <duration> $duration`,
        );
        break;
    }
    this.params.duration = value;
    return this;
  }

  public dateRange(date: ITaskQuery["dateRange"]) {
    if (!date) {
      return this;
    }
    const { start, end } = date;

    const q = [];
    if (start) {
      q.push(`dueDate >= $startDate`);
      this.params.startDate = new Date(start);
    }
    if (end) {
      q.push(`dueDate <= $endDate`);
      this.params.endDate = new Date(end);
    }
    if (q.length > 0) {
      this.whereClauses.push(`((${q.join(" AND ")}) OR dueDate = NULL)`);
    }
    return this;
  }

  public build(): {
    query: string;
    params: Record<string, any>;
  } {
    const where =
      this.whereClauses.length > 0
        ? `WHERE ${this.whereClauses.join(" AND ")}`
        : "";

    const query = `
      SELECT
        *
      OMIT embeddings
      FROM task
      ${where}
      ${this.sortClause}
      ${this.paginationClause}
    `;

    return {
      query,
      params: this.params,
    };
  }
}
