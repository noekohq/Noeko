import { Router } from "express";
import { checkToken } from "../middleware/auth";
import { getFromReq } from "../utils/requests";
import { ISafeUser } from "../database/models/user";
import { Idea } from "../database/models/ideas";
import { AnalysisService } from "../services/Analysis";
import Dashboard from "../services/Dashboard";

const router = Router();

router.use(checkToken);

router.get("/", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      throw new Error("User is not logged in.");
    }

    const dashboard = await Dashboard.get(user.id);

    res.send({
      message: "Got Dashboard Successfully...",
      data: dashboard,
    });
  } catch (error) {
    console.error("Error getting user dashboard: ", error);
    res.status(500).send({
      message: "Internal Server Error",
    });
  }
});

router.get("/central-ideas", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      throw new Error("User is not logged in.");
    }

    const centralIdeas = await AnalysisService.getUserCentralIdeas(user.id);

    res.send({
      message: "Got Central Ideas Successfully...",
      data: centralIdeas,
    });
  } catch (error) {
    console.error("Error getting central ideas: ", error);
    res.status(500).send({
      message: "Internal Server Error",
    });
  }
});

router.get("/semantic-central-ideas", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      throw new Error("User is not logged in.");
    }

    const centralIdeas = await AnalysisService.getUserSemanticCentralIdeas(
      user.id,
    );

    res.send({
      message: "Got Central Ideas Successfully...",
      data: centralIdeas,
    });
  } catch (error) {
    console.error("Error getting central ideas: ", error);
    res.status(500).send({
      message: "Internal Server Error",
    });
  }
});

export default router;
