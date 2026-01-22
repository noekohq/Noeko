import { RecordId } from "surrealdb";
import { IUser } from "./user";

export type IFeedback = {
  id: RecordId | string;
  content: string;
  consentToContact: boolean;
  status: "unaddressed" | "in-progress" | "addressed";
  user?: IUser;
  createdAt: Date;
  updatedAt: Date;
};

export type IFeedbackForm = Omit<
  IFeedback,
  "id" | "createdAt" | "updatedAt" | "user"
>;
