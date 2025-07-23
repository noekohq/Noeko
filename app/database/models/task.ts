import { RecordId } from "surrealdb";

export type ITask = {
  id: string | RecordId;
  description: string;
  dueDate: Date;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
};
