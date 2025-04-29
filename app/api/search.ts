import { Router } from "express";
import { checkToken, disallowDisabled } from "../middleware/auth";
import { getFromReq } from "../utils/requests";
import { ISafeUser } from "../database/models/user";
import { Search } from "../services/Search";

const router = Router();

router.get("/ideas/suggest", checkToken, async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }
    const query = req.query.query as string;
    const suggestions = await Search.suggest(user.id, query);
    res.json({
      message: "Suggestions fetched successfully",
      data: suggestions,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/ideas/suggest", checkToken, async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }
    const query = req.body.query as string;
    const suggestions = await Search.suggest(user.id, query);
    res.json({
      message: "Suggestions fetched successfully",
      data: suggestions,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.use(disallowDisabled);
export default router;
