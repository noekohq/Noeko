import { Router } from "express";
import { checkToken, disallowDisabled } from "../middleware/auth";
import { getFromReq } from "../utils/requests";
import { ISafeUser, User } from "../database/models/user";
import Source from "../database/models/source";

const router = Router();

router.use(checkToken, disallowDisabled);

router.get("/", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(401).json({
        error: "Unauthorized",
        message: "User not found.",
      });
      return;
    }
    const sources = await Source.all(user.id);
    res.send({
      message: "Successfully retrieved sources",
      data: sources,
    });
  } catch (error) {
    res.status(500).send({
      message: "Something went wrong.",
    });
  }
});

router.post("/from", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(401).json({
        error: "Unauthorized",
        message: "User not found.",
      });
      return;
    }
    const { thingId } = req.body;

    const isSourceable = Source.isSourceable(thingId);
    if (!isSourceable) {
      res.status(400).send({
        message: "Thing is not sourceable",
      });
      return;
    }

    const source = await Source.fromSourceable(user.id, thingId, "private");
    if (!source) {
      throw new Error("No source created.");
    }

    res.send({
      message: "Successfully created source",
      data: source,
    });
  } catch (error) {
    console.error("Error creating source from sourceable", error);
    res.status(500).send({
      message: "Something went wrong.",
    });
  }
});

router.get("/:sourceId", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(401).json({
        error: "Unauthorized",
        message: "User not found.",
      });
      return;
    }

    const sourceId = req.params.sourceId;
    const owns = await User.checkOwns(user.id, sourceId);
    if (!owns) {
      res.status(403).send({
        message: "Unauthorized.",
      });
      return;
    }

    const source = await Source.get(sourceId);
    if (!source) {
      throw new Error("Couldn't get source");
    }
    res.send({
      message: "Successfully fetched source",
      data: source,
    });
  } catch (error) {
    console.error("Error getting source: ", error);
    res.status(500).send({
      message: "Error getting source",
    });
  }
});

router.get("/:sourceId/analyze", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(401).json({
        error: "Unauthorized",
        message: "User not found.",
      });
      return;
    }

    const sourceId = req.params.sourceId;
    const owns = await User.checkOwns(user.id, sourceId);
    if (!owns) {
      res.status(403).send({
        message: "Unauthorized.",
      });
      return;
    }

    const analysis = await Source.loadAnalysis(sourceId);
    await Source.loadEmbeddings(sourceId);

    if (!analysis) {
      throw new Error("Couldn't load analysis");
    }

    res.send({
      message: "Successfully analyzed source",
      data: analysis,
    });
  } catch (error) {
    res.status(500).send({
      message: "Something went wrong.",
    });
  }
});

router.put("/:sourceId", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(401).json({
        error: "Unauthorized",
        message: "User not found.",
      });
      return;
    }

    const sourceId = req.params.sourceId;
    const owns = await User.checkOwns(user.id, sourceId);
    if (!owns) {
      res.status(403).send({
        message: "Unauthorized.",
      });
      return;
    }

    const { ...updates } = req.body;
    const result = await Source.update(sourceId, updates);
    res.send({
      message: "Successfully updated source",
      data: result,
    });
  } catch (error) {
    res.status(500).send({
      message: "Something went wrong.",
    });
  }
});

export default router;
