import { RecordId } from "surrealdb";

export type ITask = {
  id: string | RecordId;
  title: string;
  description: string;
  priority: string;
  dueDate: Date;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
};
