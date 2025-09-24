import { RecordId, StringRecordId } from "surrealdb";
import { IUser, User } from "./user";
import { getDatabase } from "../db";

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

export class Feedback {
  constructor() {}

  static async create(form: IFeedbackForm, user: string | RecordId) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Error getting database to create feedback");
      }
      const foundUser = await User.get(user);
      if (!foundUser) {
        throw new Error(
          "Tried to create feedback item for user that does not exist",
        );
      }
      const result = await db.create<
        IFeedback,
        IFeedbackForm & {
          createdAt: Date;
          updatedAt: Date;
          user: StringRecordId;
        }
      >("feedback", {
        content: form.content,
        consentToContact: form.consentToContact,
        status: form.status,
        user: new StringRecordId(foundUser.id),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      if (!result) {
        throw new Error("Result from feedback is falsey");
      }
      const [feedback] = result;
      return feedback;
    } catch (error) {
      console.error("Error creating feedback: ", error);
      return undefined;
    }
  }

  static async update(id: string, form: Partial<IFeedbackForm>) {
    try {
      const db = await getDatabase();

      const updater: Partial<IFeedbackForm> = form;

      const result = await db?.merge<
        IFeedback,
        Partial<IFeedbackForm> & { updatedAt: Date }
      >(new StringRecordId(id), {
        ...updater,
        updatedAt: new Date(),
      });
      if (!result) {
        console.error("Failed to update feedback");
        return undefined;
      }
      const feedback = result;
      return feedback;
    } catch (error) {
      console.error("Error updating feedback:", error);
      throw error;
    }
  }

  static async delete(id: string) {
    try {
      const db = await getDatabase();
      const result = await db?.delete<IFeedback>(new StringRecordId(id));
      if (!result) {
        throw Error("Failed to delete feedback");
      }
      const feedback = result;
      return feedback;
    } catch (error) {
      console.error("Error deleting feedback:", error);
      throw error;
    }
  }

  static async get(id: string | RecordId) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Error getting database when getting feedback item");
      }
      const result = await db.select<IFeedback>(new StringRecordId(id));
      if (!result) {
        throw new Error("Could not select feedback item");
      }
      return result;
    } catch (error) {
      console.error("Error getting id: ", error);
      return undefined;
    }
  }

  static async getAll() {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Error getting database when getting feedback item");
      }
      const result = await db.query<[IFeedback[]]>(
        "SELECT * FROM feedback ORDER BY updatedAt DESC FETCH user;",
      );
      if (!result) {
        throw new Error("Could not select feedback items");
      }
      const [feedback] = result;
      return feedback;
    } catch (error) {
      console.error("Error getting feedback items: ", error);
      return undefined;
    }
  }

  static async getAllOpen() {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Error getting database when getting feedback item");
      }
      const result = await db.query<[IFeedback[]]>(
        "SELECT * FROM feedback WHERE status != 'addressed' FETCH user;",
      );
      if (!result) {
        throw new Error("Could not select feedback items");
      }
      const [feedback] = result;
      return feedback;
    } catch (error) {
      console.error("Error getting feedback items: ", error);
      return undefined;
    }
  }
}
