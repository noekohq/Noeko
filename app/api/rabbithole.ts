import { Router } from "express";
import { checkToken, disallowDisabled } from "../middleware/auth";
import { getFromReq } from "../utils/requests";
import { ISafeUser, User } from "../database/models/user";
import Rabbithole from "../database/models/rabbithole";

const router = Router();

router.use(checkToken);
router.use(disallowDisabled);

router.post("/", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).send({
        message: "Unauthorized.",
      });
      return;
    }
    const form = req.body;
    if (!form.name) {
      res.status(400).send({
        message: "Name is required.",
      });
      return;
    }
    const rabbithole = await Rabbithole.create(user.id, form);
    if (!rabbithole) {
      res.status(500).send({
        message: "Internal Server Error",
      });
      return;
    }
    res.send({
      message: "Successfully created rabbithole",
      data: rabbithole,
    });
  } catch (error) {
    res.status(500).send({
      message: "Internal Server Error",
    });
  }
});

router.post("/new", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).send({
        message: "Unauthorized.",
      });
      return;
    }
    const rabbithole = await Rabbithole.create(user.id, {
      name: "Unnamed Rabbithole",
    });
    if (!rabbithole) {
      res.status(500).send({
        message: "Internal Server Error",
      });
      return;
    }
    res.send({
      message: "Successfully created rabbithole",
      data: rabbithole,
    });
  } catch (error) {
    res.status(500).send({
      message: "Internal Server Error",
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).send({
        message: "Unauthorized.",
      });
      return;
    }
    const limit = parseInt(req.query.limit as string) || 10;
    const rabbitholes = await Rabbithole.getAll(user.id.toString(), { limit });
    if (!rabbitholes) {
      res.status(500).send({
        message: "Internal Server Error",
      });
      return;
    }
    res.send({
      message: "Successfully retrieved rabbitholes",
      data: rabbitholes,
    });
  } catch (error) {
    res.status(500).send({
      message: "Internal Server Error",
    });
  }
});

router.get("/:rabbitholeId", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).send({
        message: "Unauthorized.",
      });
      return;
    }
    const rabbitholeId = req.params.rabbitholeId;
    const hasAccessToRabbithole = await User.checkOwns(user.id, rabbitholeId);
    if (!hasAccessToRabbithole) {
      res.status(403).send({
        message: "Unauthorized.",
      });
      return;
    }
    const rabbithole = await Rabbithole.get(rabbitholeId);
    if (!rabbithole) {
      res.status(404).send({
        message: "Rabbithole not found",
      });
      return;
    }
    res.send({
      message: "Successfully retrieved rabbithole",
      data: rabbithole,
    });
  } catch (error) {
    res.status(500).send({
      message: "Internal Server Error",
    });
  }
});

router.put("/:rabbitholeId", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).send({
        message: "Unauthorized.",
      });
      return;
    }
    const rabbitholeId = req.params.rabbitholeId;
    const hasAccessToRabbithole = await User.checkOwns(user.id, rabbitholeId);
    if (!hasAccessToRabbithole) {
      res.status(403).send({
        message: "Unauthorized.",
      });
      return;
    }
    const { name } = req.body as { name: string };
    if (!(typeof name === "string")) {
      res.status(400).send({
        message: "Invalid name. Name must be a string",
      });
      return;
    }
    const rabbithole = await Rabbithole.update(rabbitholeId, {
      name,
    });
    if (!rabbithole) {
      res.status(404).send({
        message: "Rabbithole not found",
      });
      return;
    }
    res.send({
      message: "Successfully updated rabbithole",
      data: rabbithole,
    });
  } catch (error) {
    res.status(500).send({
      message: "Internal Server Error",
    });
  }
});

router.delete("/:rabbitholeId", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).send({
        message: "Unauthorized.",
      });
      return;
    }
    const rabbitholeId = req.params.rabbitholeId;
    const hasAccessToRabbithole = await User.checkOwns(user.id, rabbitholeId);
    if (!hasAccessToRabbithole) {
      res.status(403).send({
        message: "Unauthorized.",
      });
      return;
    }
    await Rabbithole.delete(rabbitholeId);
    res.send({
      message: "Successfully deleted rabbithole",
    });
  } catch (error) {
    console.error("Error deleting rabbithole: ", error);
    res.send({ message: "Something went wrong." });
  }
});

router.get("/:rabbitholeId/similar-ideas", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).send({
        message: "Unauthorized.",
      });
      return;
    }
    const { rabbitholeId } = req.params;
    const hasAccessToRabbithole = await User.checkOwns(user.id, rabbitholeId);
    if (!hasAccessToRabbithole) {
      res.status(403).send({
        message: "Unauthorized.",
      });
      return;
    }
    const similarIdeas = await Rabbithole.findSimilarIdeas(
      rabbitholeId,
      user.id,
    );
    res.send({
      message: "Successfully retrieved similar ideas",
      data: similarIdeas,
    });
  } catch (error) {
    res.status(500).send({
      message: "Internal Server Error",
    });
  }
});

router.get("/:rabbitholeId/suggestions", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).send({
        message: "Unauthorized.",
      });
      return;
    }
    const { rabbitholeId } = req.params;
    const limit = Number(req.query.limit as string) ?? 25;
    const threshold = Number(req.query.threshold as string);

    const hasAccessToRabbithole = await User.checkOwns(user.id, rabbitholeId);
    if (!hasAccessToRabbithole) {
      res.status(403).send({
        message: "Unauthorized.",
      });
      return;
    }
    const similarThings = await Rabbithole.getSimilarThings(
      user.id,
      rabbitholeId,
      { limit, threshold },
    );
    res.send({
      message: "Successfully retrieved similar ideas",
      data: similarThings,
    });
  } catch (error) {
    res.status(500).send({
      message: "Internal Server Error",
    });
  }
});

router.post("/:rabbitholeId/include", async (req, res) => {
  try {
    const { rabbitholeId } = req.params;
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).send({
        message: "Unauthorized.",
      });
      return;
    }
    const { thingId } = req.body as { thingId: string | null };
    if (!thingId) {
      res.status(400).send({
        message: "No thingId included",
      });
      return;
    }
    const hasAccess = await User.checkOwns(user.id, thingId);
    const hasAccessToRabbithole = await User.checkOwns(user.id, rabbitholeId);
    if (!hasAccess || !hasAccessToRabbithole) {
      res.status(400).send({
        message: "You do not have access to this thing.",
      });
      return;
    }
    const result = await Rabbithole.addThing(rabbitholeId, thingId);
    res.send({
      message: "Successfully included thing",
      data: result,
    });
  } catch (error) {
    console.error("Error including rabbitholes: ", error);
    res.status(500).send({
      message: "Internal Server Error",
    });
  }
});

router.post("/:rabbitholeId/uninclude", async (req, res) => {
  try {
    const { rabbitholeId } = req.params;
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).send({
        message: "Unauthorized.",
      });
      return;
    }
    const { thingId } = req.body as { thingId: string | null };
    if (!thingId) {
      res.status(400).send({
        message: "No thingId included",
      });
      return;
    }
    const hasAccess = await User.checkOwns(user.id, thingId);
    const hasAccessToRabbithole = await User.checkOwns(user.id, rabbitholeId);
    if (!hasAccess || !hasAccessToRabbithole) {
      res.status(400).send({
        message: "You do not have access to this thing.",
      });
      return;
    }
    const result = await Rabbithole.removeThing(rabbitholeId, thingId);
    res.send({
      message: "Successfully unincluded thing",
      data: result,
    });
  } catch (error) {
    console.error("Error unincluding rabbitholes: ", error);
    res.status(500).send({
      message: "Internal Server Error",
    });
  }
});

export default router;
