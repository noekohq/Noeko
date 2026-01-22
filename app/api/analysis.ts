import { Router } from "express";
import { checkToken, disallowDisabled } from "../middleware/auth";
import { getFromReq } from "../utils/requests";
import { ISafeUser } from "../../shared/types/user";
import { AnalysisService } from "../services/Analysis";

const router = Router();

router.use(checkToken, disallowDisabled);

router.get("/heatmap", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      throw new Error("User is not logged in.");
    }
    const heatmap = await AnalysisService.getUserHeatmap(user.id);
    res.send({
      message: "Heatmap successfully fetched",
      data: heatmap,
    });
  } catch (error) {
    console.error("Error generating user heatmap", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/tag-breakdown", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      throw new Error("User is not logged in.");
    }
    const breakdown = await AnalysisService.getUserTagBreakdown(user.id);
    res.send({
      message: "Tag breakdown successfully fetched",
      data: breakdown,
    });
  } catch (error) {
    console.error("Error getting user tag breakdown", error);
    res.status(500).json({
      error: "Internal Server Error",
    });
  }
});

router.get("/progress", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      throw new Error("User is not logged in.");
    }

    const { startDate, endDate, dataTypes } = req.query;

    if (
      typeof startDate !== "string" ||
      typeof endDate !== "string" ||
      typeof dataTypes !== "string"
    ) {
      res.status(400).json({ error: "Missing or invalid query parameters." });
      return;
    }

    const options = {
      startDate,
      endDate,
      dataTypes: dataTypes.split(","),
    };

    const progress = await AnalysisService.getUserProgress(user.id, options);
    res.send({
      message: "Progress data successfully fetched",
      data: progress,
    });
  } catch (error) {
    console.error("Error generating user progress data", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
