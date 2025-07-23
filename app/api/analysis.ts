import { Router } from "express";
import { checkToken, disallowDisabled } from "../middleware/auth";
import { getFromReq } from "../utils/requests";
import { ISafeUser } from "../database/models/user";
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

export default router;
