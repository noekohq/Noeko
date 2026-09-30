import { Router } from "express";
import { checkToken, disallowDisabled } from "../middleware/auth";
import { getFromReq } from "../utils/requests";
import { User } from "../database/models/user";
import { ISafeUser } from "../../shared/types/user";
import Rabbithole from "../database/models/rabbithole";
import RabbitholeRecommendations from "../services/RabbitholeRecommendations";
import { IRabbitholeRecommendationPolicy } from "../../shared/types/rabbithole";

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
    const limit = parseInt(req.query.limit as string);
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

router.post("/:rabbitholeId/entitle", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    const { rabbitholeId } = req.params;
    if (!user || !(await User.checkOwns(user.id, rabbitholeId))) {
      res.status(403).send({ message: "Unauthorized." });
      return;
    }
    if (!((await Rabbithole.getThings(rabbitholeId)) ?? []).length) {
      res.status(400).send({ message: "Add some content before generating a title." });
      return;
    }
    const rabbithole = await Rabbithole.giveGenerativeName(rabbitholeId);
    if (!rabbithole) {
      res.status(500).send({ message: "Could not generate a Rabbithole title." });
      return;
    }
    res.send({ message: "Generated Rabbithole title", data: rabbithole });
  } catch (error) {
    console.error("Error generating Rabbithole title: ", error);
    res.status(500).send({ message: "Internal Server Error" });
  }
});

router.post("/:rabbitholeId/describe", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    const { rabbitholeId } = req.params;
    if (!user || !(await User.checkOwns(user.id, rabbitholeId))) {
      res.status(403).send({ message: "Unauthorized." });
      return;
    }
    if (!((await Rabbithole.getThings(rabbitholeId)) ?? []).length) {
      res.status(400).send({ message: "Add some content before generating a description." });
      return;
    }
    const rabbithole = await Rabbithole.giveGenerativeDescription(rabbitholeId);
    if (!rabbithole) {
      res.status(500).send({ message: "Could not generate a Rabbithole description." });
      return;
    }
    res.send({ message: "Generated Rabbithole description", data: rabbithole });
  } catch (error) {
    console.error("Error generating Rabbithole description: ", error);
    res.status(500).send({ message: "Internal Server Error" });
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
    const { name, description, recommendationPolicy } = req.body as {
      name?: string;
      description?: string;
      recommendationPolicy?: IRabbitholeRecommendationPolicy;
    };
    if (name !== undefined && typeof name !== "string") {
      res.status(400).send({
        message: "Invalid name. Name must be a string",
      });
      return;
    }
    if (description !== undefined && typeof description !== "string") {
      res.status(400).send({ message: "Invalid description. Description must be a string" });
      return;
    }
    if (
      recommendationPolicy !== undefined &&
      (typeof recommendationPolicy !== "object" ||
        !["suggest", "auto-add"].includes(recommendationPolicy.mode) ||
        !Number.isFinite(recommendationPolicy.threshold) ||
        recommendationPolicy.threshold < 0 ||
        recommendationPolicy.threshold > 1 ||
        !Array.isArray(recommendationPolicy.types))
    ) {
      res.status(400).send({ message: "Invalid recommendation policy" });
      return;
    }
    const rabbithole = await Rabbithole.update(rabbitholeId, {
      ...(name !== undefined
        ? { name: name.trim() || "Untitled Rabbithole", nameGeneratedAt: undefined }
        : {}),
      ...(description !== undefined
        ? { description: description.trim(), descriptionGeneratedAt: undefined }
        : {}),
      ...(recommendationPolicy !== undefined ? { recommendationPolicy } : {}),
    });
    if (!rabbithole) {
      res.status(404).send({
        message: "Rabbithole not found",
      });
      return;
    }
    if (name !== undefined || description !== undefined) {
      await Rabbithole.cacheCentroidVector(rabbitholeId);
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

router.get("/:rabbitholeId/activity", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user || !(await User.checkOwns(user.id, req.params.rabbitholeId))) {
      res.status(403).send({ message: "Unauthorized." });
      return;
    }
    const activity = await RabbitholeRecommendations.getAutoAddActivity(req.params.rabbitholeId);
    res.send({ message: "Rabbithole activity retrieved", data: activity });
  } catch (error) {
    console.error("Error retrieving Rabbithole activity: ", error);
    res.status(500).send({ message: "Internal Server Error" });
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
    const deleted = await Rabbithole.delete(rabbitholeId);
    if (!deleted) {
      res.status(500).send({ message: "Could not delete Rabbithole" });
      return;
    }
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
    const similarIdeas = await Rabbithole.findSimilarIdeas(rabbitholeId, user.id);
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
    const hasAccessToRabbithole = await User.checkOwns(user.id, rabbitholeId);
    if (!hasAccessToRabbithole) {
      res.status(403).send({
        message: "Unauthorized.",
      });
      return;
    }
    const similarThings = await RabbitholeRecommendations.getPersistedSuggestions(rabbitholeId);
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

router.post("/:rabbitholeId/suggestions/reconcile", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).send({ message: "Unauthorized." });
      return;
    }
    const { rabbitholeId } = req.params;
    if (!(await User.checkOwns(user.id, rabbitholeId))) {
      res.status(403).send({ message: "Unauthorized." });
      return;
    }
    const suggestions = await RabbitholeRecommendations.reconcile(user.id, rabbitholeId, {
      limit: Number(req.body?.limit) || 30,
    });
    res.send({ message: "Rabbithole suggestions refreshed", data: suggestions });
  } catch (error) {
    console.error("Error reconciling rabbithole suggestions: ", error);
    res.status(500).send({ message: "Internal Server Error" });
  }
});

router.post("/:rabbitholeId/suggestions/:thingId/accept", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).send({ message: "Unauthorized." });
      return;
    }
    const { rabbitholeId, thingId } = req.params;
    if (
      !(await User.checkOwns(user.id, rabbitholeId)) ||
      !(await User.checkOwns(user.id, thingId))
    ) {
      res.status(403).send({ message: "Unauthorized." });
      return;
    }
    const inclusion = await RabbitholeRecommendations.accept(rabbitholeId, thingId);
    if (!inclusion) {
      res.status(500).send({ message: "Could not accept suggestion" });
      return;
    }
    res.send({ message: "Suggestion accepted", data: inclusion });
  } catch (error) {
    console.error("Error accepting rabbithole suggestion: ", error);
    res.status(500).send({ message: "Internal Server Error" });
  }
});

router.post("/:rabbitholeId/suggestions/:thingId/dismiss", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).send({ message: "Unauthorized." });
      return;
    }
    const { rabbitholeId, thingId } = req.params;
    if (
      !(await User.checkOwns(user.id, rabbitholeId)) ||
      !(await User.checkOwns(user.id, thingId))
    ) {
      res.status(403).send({ message: "Unauthorized." });
      return;
    }
    await RabbitholeRecommendations.dismiss(rabbitholeId, thingId);
    res.send({ message: "Suggestion dismissed" });
  } catch (error) {
    console.error("Error dismissing rabbithole suggestion: ", error);
    res.status(500).send({ message: "Internal Server Error" });
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
    if (!result) {
      res.status(500).send({ message: "Could not include thing" });
      return;
    }
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

router.post("/:rabbitholeId/include/many", async (req, res) => {
  try {
    const { rabbitholeId } = req.params;
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).send({
        message: "Unauthorized.",
      });
      return;
    }
    const { thingIds } = req.body as { thingIds: string[] | null };
    if (!thingIds) {
      res.status(400).send({
        message: "No thingId included",
      });
      return;
    }
    const hasAccess = await User.checkOwnsMany(user.id, thingIds);
    const hasAccessToRabbithole = await User.checkOwns(user.id, rabbitholeId);
    if (!hasAccess || !hasAccessToRabbithole) {
      res.status(400).send({
        message: "You do not have access to this thing.",
      });
      return;
    }
    const result = await Rabbithole.addThings(rabbitholeId, thingIds);
    if (!result) {
      res.status(500).send({ message: "Could not include things" });
      return;
    }
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
    if (!result) {
      res.status(500).send({ message: "Could not remove thing" });
      return;
    }
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
