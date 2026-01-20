import Router from "express";
import { checkToken, disallowDisabled } from "../middleware/auth";
import { getFromReq } from "../utils/requests";
import { ISafeUser } from "../../shared/types/user";
import Insights from "../services/Insights";

const router = Router();

router.use(checkToken, disallowDisabled);

router.get("/recent", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(401).send({
        message: "Unauthenticated.",
      });
      return;
    }

    const limit = Number(req.query.limit as string);

    const recents = await Insights.recent(user.id, {
      limit: limit ?? undefined,
    });

    if (!recents) {
      res.status(404).send({
        message: "No recent things found.",
      });
      return;
    }

    res.status(200).send({
      message: "Recent things retrieved successfully.",
      data: recents,
    });
  } catch (error) {
    console.error("Error getting recent things: ", error);
    return undefined;
  }
});

export default router;
