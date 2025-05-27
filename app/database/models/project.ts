import { RecordId, StringRecordId } from "surrealdb";
import { getDatabase } from "../db";
import { User } from "./user";
import { Idea } from "./ideas"; // Assuming Idea model is in this path

export type IProject = {
  id: string | RecordId;
  name: string;
  description?: string; // Optional description for a project
  createdAt: Date;
  updatedAt: Date;
};

export type IProjectForm = Omit<IProject, "id" | "createdAt" | "updatedAt">;

// User -> owns -> Project
export type IProjectUserOwnership = {
  id: string | RecordId;
  in: string | RecordId; // User ID
  out: string | RecordId; // Project ID
  createdAt: Date;
};

// Project -> contains -> Idea
export type IProjectIdeaRelationship = {
  id: string | RecordId;
  in: string | RecordId; // Project ID
  out: string | RecordId; // Idea ID
  createdAt: Date;
};

export class Project {
  static async up() {
    const db = await getDatabase();
    if (!db) {
      throw new Error("Something went wrong getting the database");
    }

    const getUserProjectsFunction = () => {
      return `
      DEFINE FUNCTION OVERWRITE fn::get_user_projects(
        $userId: record<user>,
      ) {
        RETURN SELECT VALUE ->owns->project FROM ONLY $userId FETCH project;
      }`;
    };

    const getProjectIdeasFunction = () => {
      return `
      DEFINE FUNCTION OVERWRITE fn::get_project_ideas(
        $projectId: record<project>,
      ) {
        RETURN SELECT VALUE ->contains->idea FROM ONLY $projectId FETCH idea;
      }`;
    };

    await db.query(getUserProjectsFunction());
    await db.query(getProjectIdeasFunction());
  }

  static async create(
    form: IProjectForm,
    userId: string | RecordId,
  ): Promise<IProject | undefined> {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Error getting database to create project");
      }

      const user = await User.get(userId);
      if (!user) {
        throw new Error(
          "Tried to create project for a user that does not exist",
        );
      }

      const result = await db.create<
        IProject,
        IProjectForm & { createdAt: Date; updatedAt: Date }
      >("project", {
        ...form,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      if (!result || result.length === 0) {
        throw new Error("Result from project creation is falsey or empty");
      }

      const [projectRecord] = result;

      // Create ownership relationship: User -> owns -> Project
      await db.query(
        `RELATE $userId ->owns-> $projectId SET createdAt = $now;`,
        {
          userId: new StringRecordId(userId),
          projectId: projectRecord.id,
          now: new Date(),
        },
      );

      return projectRecord;
    } catch (error) {
      console.error("Error creating project: ", error);
      return undefined;
    }
  }
  static async get(id: string | RecordId): Promise<IProject | undefined> {
    try {
      const db = await getDatabase();
      if (!db) throw new Error("Error getting database");
      const result = await db.select<IProject>(new StringRecordId(id));
      if (!result) {
        console.warn("Could not find project with id: " + id.toString());
        return undefined;
      }
      return result;
    } catch (error) {
      console.error("Error getting project: ", error);
      return undefined;
    }
  }

  static async getUserProjects(
    userId: string | RecordId,
  ): Promise<IProject[] | undefined> {
    try {
      const db = await getDatabase();
      if (!db) throw new Error("Error getting database");
      const result = await db.run<IProject[]>("fn::get_user_projects", [
        new StringRecordId(userId),
      ]);
      if (!result) {
        console.warn("Error getting user projects or user has no projects");
        return [];
      }
      return result;
    } catch (error) {
      console.error("Error getting user projects: ", error);
      return undefined;
    }
  }

  static async update(
    id: string | RecordId,
    data: Partial<IProjectForm>,
  ): Promise<IProject | undefined> {
    try {
      const db = await getDatabase();
      if (!db) throw new Error("Error getting database");
      const result = await db.merge<
        IProject,
        Partial<IProjectForm> & { updatedAt: Date }
      >(new StringRecordId(id), {
        ...data,
        updatedAt: new Date(),
      });
      if (!result) throw new Error("Result from project update is falsey");
      return result;
    } catch (error) {
      console.error("Error updating project: ", error);
      return undefined;
    }
  }

  static async delete(id: string | RecordId): Promise<boolean> {
    try {
      const db = await getDatabase();
      if (!db) throw new Error("Error getting database");
      const projectIdObject = new StringRecordId(id);

      // Delete 'owns' relationships pointing to this project
      await db.query(`DELETE owns WHERE out = $projectId;`, {
        projectId: projectIdObject,
      });

      // Delete 'contains' relationships originating from this project
      await db.query(`DELETE contains WHERE in = $projectId;`, {
        projectId: projectIdObject,
      });

      // Delete the project itself
      const result = await db.delete<IProject>(projectIdObject);
      return (
        result !== undefined && (!Array.isArray(result) || result.length > 0)
      );
    } catch (error) {
      console.error("Error deleting project: ", error);
      return false;
    }
  }

  static async checkUserOwnership(
    projectId: string | RecordId,
    userId: string | RecordId,
  ): Promise<boolean> {
    try {
      const db = await getDatabase();
      if (!db) throw new Error("Error getting database");
      const result = await db.query<[{ count: number }]>(
        `SELECT count() AS count FROM owns WHERE in = $userId AND out = $projectId GROUP BY ALL;`,
        {
          userId: new StringRecordId(userId),
          projectId: new StringRecordId(projectId),
        },
      );
      return result?.[0]?.count > 0;
    } catch (error) {
      console.error("Error checking user ownership for project: ", error);
      return false;
    }
  }

  static async connectToIdea(
    projectId: string | RecordId,
    ideaId: string | RecordId,
  ): Promise<IProjectIdeaRelationship | undefined> {
    try {
      const db = await getDatabase();
      if (!db) throw new Error("Error getting database");

      const project = await Project.get(projectId);
      if (!project) throw new Error(`Project with id ${projectId} not found.`);
      const idea = await Idea.get(ideaId);
      if (!idea) throw new Error(`Idea with id ${ideaId} not found.`);

      const result = await db.query<[IProjectIdeaRelationship]>(
        `RELATE $projectId ->contains-> $ideaId SET createdAt = $now;`,
        {
          projectId: new StringRecordId(projectId),
          ideaId: new StringRecordId(ideaId),
          now: new Date(),
        },
      );
      if (!result) {
        console.error(
          `No relationship created for project "${projectId}" and idea "${ideaId}".`,
        );
        return undefined;
      }
      return result[0];
    } catch (err) {
      console.error(
        `Error during connectToIdea for project "${projectId}" and idea "${ideaId}":`,
        err,
      );
      return undefined;
    }
  }

  static async disconnectFromIdea(
    projectId: string | RecordId,
    ideaId: string | RecordId,
  ): Promise<boolean> {
    try {
      const db = await getDatabase();
      if (!db) throw new Error("Error getting database");
      await db.query(
        `DELETE contains WHERE in = $projectId AND out = $ideaId;`,
        {
          projectId: new StringRecordId(projectId),
          ideaId: new StringRecordId(ideaId),
        },
      );
      return true;
    } catch (err) {
      console.error(
        `Error during disconnectFromIdea for project "${projectId}" and idea "${ideaId}":`,
        err,
      );
      return false;
    }
  }

  static async getIdeasForProject(
    projectId: string | RecordId,
  ): Promise<Idea[] | undefined> {
    try {
      const db = await getDatabase();
      if (!db) throw new Error("Error getting database");
      const results = await db.run<Idea[]>("fn::get_project_ideas", [
        new StringRecordId(projectId),
      ]);
      if (!results) {
        console.warn("Error getting ideas for project or project has no ideas");
        return [];
      }
      return results;
    } catch (error) {
      console.error("Error getting ideas for project: ", error);
      return undefined;
    }
  }
}
