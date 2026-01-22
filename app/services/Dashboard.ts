import { RecordId } from "surrealdb";
import { Idea } from "../database/models/ideas";
import { ISafeIdea, IUserIdeaStats } from "../../shared/types/idea";
import { AnalysisService } from "./Analysis";

export type IDashboard = {
  recentIdeas?: ISafeIdea[];
  ideaStats?: IUserIdeaStats;
  totalUsers?: number;
};

export default class Dashboard {
  constructor() {}

  public static async get(
    userId: string | RecordId,
  ): Promise<IDashboard | undefined> {
    try {
      const recentIdeas = await Idea.getUserRecentIdeas(userId, 10);
      const ideaStats = await Idea.getUserIdeaStats(userId);
      const totalUsers = await AnalysisService.getTotalUsers();
      return {
        recentIdeas,
        ideaStats,
        totalUsers,
      } as IDashboard;
    } catch (error) {
      console.error("Error getting user dashboard: ", error);
      return undefined;
    }
  }
}
