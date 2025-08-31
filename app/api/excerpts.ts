import { Router } from "express";
import { checkToken, disallowDisabled } from "../middleware/auth";
import { getFromReq } from "../utils/requests";
import { ISafeUser, IUser, User } from "../database/models/user";
import Excerpt from "../database/models/excerpt";

const router = Router();

router.use(checkToken, disallowDisabled);

router.post("/", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user || !user.id) {
      res.status(401).send({
        message: "Unauthorized. User not found or ID is missing.",
      });
      return;
    }

    const excerptable = req.body.excerptable;
    const note = req.body.note;
    const sourceText = req.body.sourceText;

    const created = await Excerpt.from(
      {
        id: excerptable,
        owner: user.id,
      },
      {
        note,
        sourceText,
      },
    );

    if (!created) {
      throw new Error("Didn't create excerpt");
    }

    res.send({
      message: "Excerpt created successfully",
      data: created,
    });
  } catch (error) {
    console.error("Error creating excerpt: ", error);
    res.status(500).send({
      message: "Something went wrong",
    });
  }
});

router.get("/:excerptable/all", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user || !user.id) {
      res.status(401).send({
        message: "Unauthorized. User not found or ID is missing.",
      });
      return;
    }

    const excerptableId = req.params.excerptable;

    const owns = await User.checkOwns(user.id, excerptableId);

    if (!owns) {
      res.status(403).send({
        message: "Unauthorized.",
      });
      return;
    }

    const all = Excerpt.allExcerptable(user.id, excerptableId);

    res.send({
      message: "Excerpt created successfully",
      data: all,
    });
  } catch (error) {
    console.error("Error getting from excerptable: ", error);
    res.status(500).send({
      message: "Something went wrong",
    });
  }
});

export default router;
