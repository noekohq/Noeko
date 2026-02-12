import { Router } from "express";
import { checkToken } from "../middleware/auth";
import { getFromReq } from "../utils/requests";
import { ISafeUser } from "../../shared/types/user";
import { AnalysisService } from "../services/Analysis";
import Dashboard from "../services/Dashboard";
import Recommendations from "../services/Recommendations";

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

/**
 * GET /accelerator
 * The "Active Feed" for the Overview page.
 * Returns: IShelfData[] (Urgent Tasks, Pins, Rabbitholes, Rediscovery)
 */
router.get("/accelerator", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      throw new Error("User is not logged in.");
    }

    // The service handles all the parallel fetching, scoring, and de-duping
    const acceleratorFeed = await Recommendations.getAcceleratorFeed(user.id);

    res.send({
      message: "Accelerator feed generated successfully",
      data: acceleratorFeed,
    });
  } catch (error) {
    console.error("Error generating accelerator feed: ", error);
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

    const centralIdeas = await AnalysisService.getUserSemanticCentralIdeas(user.id);

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
