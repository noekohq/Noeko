import { Router } from "express";
import { checkToken, disallowDisabled } from "../middleware/auth";
import { getFromReq } from "../utils/requests";
import { ISafeUser, IUser } from "../database/models/user";
import { Idea } from "../database/models/ideas";

const router = Router();

router.use(checkToken);
router.use(disallowDisabled);

router.post("/new", checkToken, disallowDisabled, async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }
    const i = await Idea.create(
      {
        title: "New Title",
        content: "",
        embeddings: null,
      },
      user.id,
      { omitEmbeddings: true, omitDerived: true },
    );
    if (!i) {
      res.status(404).json({ error: "Idea not created" });
      return;
    }
    res.send({ message: "Successfully created idea.", data: i });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post(
  "/:ideaId/derive",
  checkToken,
  disallowDisabled,
  async (req, res) => {
    try {
      const user = await getFromReq<ISafeUser>(req, "user");
      if (!user) {
        res.status(401).json({
          message: "Unauthorized.",
        });
        return;
      }
      const { ideaId } = req.params;
      const hasAccess = await Idea.checkUserOwnership(ideaId, user.id);
      if (!hasAccess) {
        res.status(403).json({
          message: "Unauthorized.",
        });
        return;
      }
      const { type } = req.body;
      const derivedResponse = await Idea.derive(ideaId, type);
      if (!derivedResponse) {
        res.status(500).json({
          message: "Internal Server Error.",
        });
        return;
      }
      res.json({
        message: `Successfully derived ${type} from idea`,
        data: derivedResponse,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        message: "Internal Server Error",
      });
    }
  },
);

export default router;
