import { RecordId, StringRecordId } from "surrealdb";
import { User } from "../database/models/user";
import { ideas, tags, tasks } from "../templates/onboarding";
import { Idea } from "../database/models/ideas";
import Task from "../database/models/task";
import { Tag } from "../database/models/tag";

interface ITourGuideOptions {
  userId: string | RecordId;
}

export default class TourGuide {
  private _userId: StringRecordId;
  private thingsAdded: string[] = [];

  constructor({ userId }: ITourGuideOptions) {
    this._userId = new StringRecordId(userId);
  }

  get userId() {
    return this._userId;
  }

  public async user() {
    return await User.get(this.userId.toString());
  }

  public async loadOnboarding() {
    try {
      await this.loadDefaultIdeas();
      await this.loadStartingTasks();
      await this.loadStartingTags();
    } catch (error) {
      console.error("Error loading onboarding for user: ", this.userId, error);
    }
  }

  public async loadDefaultIdeas() {
    try {
      const user = await this.user();
      for (const ideaForm of ideas) {
        const newIdea = await Idea.create(ideaForm, user.id.toString(), {
          omitEmbeddings: true,
          omitDerived: true,
        });
        if (!newIdea) {
          throw new Error("Failed to create an idea");
        }
        this.thingsAdded.push(newIdea.id.toString());
        await Idea.loadEmbeddings(newIdea.id, true);
      }
      return true;
    } catch (error) {
      console.error("Error loading default onboarding: ", error);
      return false;
    }
  }

  public async loadStartingTasks() {
    try {
      const user = await this.user();
      for (const taskForm of tasks) {
        const newTask = await Task.create(user.id.toString(), taskForm);
        if (!newTask) {
          throw new Error("Failed to create a task");
        }
        this.thingsAdded.push(newTask.id.toString());
      }
      return true;
    } catch (error) {
      console.error(
        "Couldn't load starting tasks for user: ",
        this.userId,
        error,
      );
      return false;
    }
  }

  public async loadStartingTags() {
    try {
      const user = await this.user();
      for (const tagForm of tags) {
        const newTag = await Tag.create(tagForm, user.id.toString());
        if (!newTag) {
          throw new Error("Failed to create a tag");
        }
      }
      return true;
    } catch (error) {
      console.error(
        "Couldn't load starting tags for user: ",
        this.userId,
        error,
      );
      return false;
    }
  }
}
