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

export default router;
