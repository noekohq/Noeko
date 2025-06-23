import { RecordId } from "surrealdb";
import { IIdea } from "./ideas";

export type IProjectIncludes = IIdea;

export type IProject = {
  id: string | RecordId;
  name: string;
  includes?: IProjectIncludes[];
  createdAt: Date;
  updatedAt: Date;
};

export type IProjectCreator = Omit<IProject, "id" | "includes">;

export type IProjectForm = Omit<IProjectCreator, "createdAt" | "updatedAt">;

export default class Project {
  constructor() {}

  static async create(userId: string | RecordId, form: IProjectForm) {
    try {
    } catch (error) {
      console.error(error);
      return undefined;
    }
  }
}
