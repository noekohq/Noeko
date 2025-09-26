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

    const excerptableId = req.body.excerptableId;
    const note = req.body.note;
    const sourceText = req.body.sourceText;
    const pdfMetadata = req.body.pdfMetadata;

    const created = await Excerpt.from(
      {
        id: excerptableId,
        owner: user.id,
      },
      {
        note,
        sourceText,
        pdfMetadata,
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

router.get("/:excerptId", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user || !user.id) {
      res.status(401).send({
        message: "Unauthorized. User not found or ID is missing.",
      });
      return;
    }

    const excerptId = req.params.excerptId;
    const owns = User.checkOwns(user.id, excerptId);
    if (!owns) {
      res.status(403).send({
        message: "Unauthorized.",
      });
      return;
    }

    const excerpt = await Excerpt.get(excerptId);

    res.send({
      message: "Successfully got excerpt",
      data: excerpt,
    });
  } catch (error) {
    console.error("Error getting excerpt: ", error);
    res.status(500).send({
      message: "Something went wrong",
    });
  }
});

router.put("/:excerptId", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user || !user.id) {
      res.status(401).send({
        message: "Unauthorized. User not found or ID is missing.",
      });
      return;
    }

    const excerptId = req.params.excerptId;
    const owns = User.checkOwns(user.id, excerptId);
    if (!owns) {
      res.status(403).send({
        message: "Unauthorized.",
      });
      return;
    }

    const note = req.body.note;
    const sourceText = req.body.sourceText;

    const updated = await Excerpt.update(excerptId, {
      note,
      sourceText,
    });
    await Excerpt.loadEmbeddings(excerptId);

    if (!updated) {
      throw new Error("Didn't update excerpt");
    }

    res.send({
      message: "Excerpt created successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Error creating excerpt: ", error);
    res.status(500).send({
      message: "Something went wrong",
    });
  }
});

router.delete("/:excerptId", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user || !user.id) {
      res.status(401).send({
        message: "Unauthorized. User not found or ID is missing.",
      });
      return;
    }

    const excerptId = req.params.excerptId;
    const owns = User.checkOwns(user.id, excerptId);
    if (!owns) {
      res.status(403).send({
        message: "Unauthorized.",
      });
      return;
    }

    const deleted = await Excerpt.delete(excerptId);

    if (!deleted) {
      throw new Error("Didn't delete excerpt");
    }

    res.send({
      message: "Excerpt deleted successfully",
      data: deleted,
    });
  } catch (error) {
    console.error("Error deleting excerpt: ", error);
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

    const all = await Excerpt.allExcerptable(user.id, excerptableId);

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
