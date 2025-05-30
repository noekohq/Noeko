import { Router } from "express";
import { checkToken } from "../middleware/auth";
import { getFromReq } from "../utils/requests";
import { ISafeUser } from "../database/models/user";
import { Idea } from "../database/models/ideas";
import { AnalysisService } from "../services/Analysis";

const router = Router();

router.use(checkToken);

router.get("/", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      throw new Error("User is not logged in.");
    }

    const recentIdeas = await Idea.getUserRecentIdeas(user.id, 10);
    const ideaStats = await Idea.getUserIdeaStats(user.id);
    const totalUsers = await AnalysisService.getTotalUsers();

    res.send({
      message: "Got Dashboard Successfully...",
      data: {
        recentIdeas,
        ideaStats,
        totalUsers,
      },
    });
  } catch (error) {
    console.error("Error getting user dashboard: ", error);
    res.status(500).send({
      message: "Internal Server Error",
    });
  }
});

export default router;
