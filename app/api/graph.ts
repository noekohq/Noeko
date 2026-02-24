import { Router } from "express";
import { Idea } from "../database/models/ideas";
import { checkIsSuperuser, checkToken, disallowDisabled } from "../middleware/auth";
import { getFromReq } from "../utils/requests";
import { User } from "../database/models/user";
import { ISafeUser, IUser } from "../../shared/types/user";
import GraphService, { ConstellationLoader, IConstellationLoader } from "../services/Graph";
import { StringRecordId } from "surrealdb";
import Authorization from "../services/Authorization";
import { logger } from "../services/Logger";

const router = Router();

router.get("/", checkToken, disallowDisabled, async (req, res) => {
  try {
    const user = await getFromReq<IUser>(req, "user");
    if (!user) {
      res.status(500).json({ message: "Internal Server Error" });
      return;
    }
    const filters = req.body.filters;
    const graph = await Idea.graph(user.id, { computeFields: true });
    if (!graph) {
      res.status(404).json({ message: "Graph not found" });
      return;
    }
    res.send({
      message: "Successfully retrieved graph.",
      data: graph,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/", checkToken, disallowDisabled, async (req, res) => {
  try {
    const user = await getFromReq<IUser>(req, "user");
    if (!user) {
      res.status(500).json({ message: "Internal Server Error" });
      return;
    }
    const loader = req.body.loader as IConstellationLoader;
    if (!loader) {
      res.status(400).send({
        message: "Constellation loader configuration is required.",
      });
      return;
    }
    const filters = req.body.filters;
    const constellationLoader = new ConstellationLoader({
      userId: user.id,
      filters: filters,
    });
    const constellation = await constellationLoader.load(loader);
    if (!constellation) {
      throw new Error("Constellation couldn't be retrieved");
    }
    res.send({
      message: "Successfully retrieved constellation.",
      data: constellation,
    });
  } catch (err) {
    console.error("Error getting user constellation: ", req, err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/connection", checkToken, disallowDisabled, async (req, res) => {
  try {
    const user = await getFromReq<IUser>(req, "user");
    if (!user) {
      res.status(403).json({ message: "Unauthorized" });
      return;
    }
    const { source, target } = req.body;
    const hasAccessToSource = await User.checkHasAccess(user.id, source);
    const hasAccessToTarget = await User.checkHasAccess(user.id, target);
    if (!hasAccessToSource || !hasAccessToTarget) {
      res.status(403).json({
        message: "Unauthorized",
      });
      return;
    }
    const isSourceConnectable = GraphService.isConnectable(source);
    if (!isSourceConnectable) {
      res.status(400).send({
        message: "Source not connectable",
      });
      return;
    }
    const isTargetConnectable = GraphService.isConnectable(target);
    if (!isTargetConnectable) {
      res.status(400).send({
        message: "Target not connectable",
      });
      return;
    }
    const connection = await GraphService.connect(source, target);
    if (!connection) {
      res.status(500).json({ message: "Connection not created" });
      return;
    }
    res.send({
      message: "Successfully created connection.",
      data: connection,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.delete("/connection", checkToken, disallowDisabled, async (req, res) => {
  try {
    const user = await getFromReq<IUser>(req, "user");
    if (!user) {
      res.status(403).json({ message: "Unauthorized" });
      return;
    }
    const { source, target } = req.body;
    const hasAccessToSource = await User.checkHasAccess(user.id, source);
    const hasAccessToTarget = await User.checkHasAccess(user.id, target);
    if (!hasAccessToSource || !hasAccessToTarget) {
      res.status(403).json({
        message: "Unauthorized",
      });
      return;
    }
    const connection = await GraphService.disconnect(source, target);
    if (!connection) {
      res.status(500).json({ error: "Connection not deleted" });
      return;
    }
    res.send({
      message: "Successfully deleted connection.",
      data: connection,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/connection", checkToken, disallowDisabled, async (req, res) => {
  try {
    const user = await getFromReq<IUser>(req, "user");
    if (!user) {
      res.status(403).json({ message: "Unauthorized" });
      return;
    }
    const { source, target } = req.body;
    const hasAccessToSource = await User.checkHasAccess(user.id, source);
    const hasAccessToTarget = await User.checkHasAccess(user.id, target);
    if (!hasAccessToSource || !hasAccessToTarget) {
      res.status(403).json({
        message: "Unauthorized",
      });
      return;
    }
    const connection = await GraphService.disconnect(source, target);
    if (!connection) {
      res.status(500).json({ error: "Connection not deleted" });
      return;
    }
    res.send({
      message: "Successfully deleted connection.",
      data: connection,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/synchronize", checkToken, disallowDisabled, checkIsSuperuser, async (req, res) => {
  try {
    const ideas = await Idea.all("full");
    if (!ideas) {
      res.status(404).json({ error: "Ideas not found" });
      return;
    }
    await Idea.synchronizeContentPlain(ideas, true);
    await Idea.synchronizeEmbeddings(ideas);
    res.send({ message: "Successfully synchronized graph." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/all", checkToken, disallowDisabled, async (req, res) => {
  try {
    const user = await getFromReq<IUser>(req, "user");
    if (!user) {
      res.status(500).json({ message: "Internal Server Error" });
      return;
    }

    const { limit, cursor, sortField, sortDirection, filters } = req.body;

    const connectables = await GraphService.getAllConnectables(new StringRecordId(user.id), {
      limit,
      cursor,
      sortField,
      sortDirection,
      filters,
    });

    if (!connectables) {
      throw new Error("Connectables couldn't be retrieved");
    }

    res.send({
      message: "Successfully retrieved all connectables.",
      data: connectables,
    });
  } catch (err) {
    console.error("Error getting all connectables: ", req, err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/:thingId/connections", checkToken, disallowDisabled, async (req, res) => {
  try {
    const user = await getFromReq<IUser>(req, "user");
    if (!user) {
      res.status(403).json({ message: "Unauthorized" });
      return;
    }
    const thingId = req.params.thingId as string;
    const hasAccess = await User.checkHasAccess(user.id, thingId);
    if (!hasAccess) {
      res.status(403).send({
        message: "Unauthorized.",
      });
      return;
    }
    const isConnectable = GraphService.isConnectable(thingId);
    if (!isConnectable) {
      res.status(400).send({
        message: "Resource not available for this type of thing",
      });
      return;
    }
    const connections = await GraphService.getUserConnectionsForThing(thingId, user.id);
    res.send({
      message: "Successfully got connections",
      data: connections,
    });
  } catch (error) {
    res.status(500).send({
      message: "Something went wrong",
    });
  }
});

router.get("/:thingId/similar", checkToken, disallowDisabled, async (req, res) => {
  try {
    const user = await getFromReq<IUser>(req, "user");
    if (!user) {
      res.status(403).json({ message: "Unauthorized" });
      return;
    }
    const thingId = req.params.thingId as string;
    const hasAccess = await User.checkHasAccess(user.id, thingId);
    if (!hasAccess) {
      res.status(403).send({
        message: "Unauthorized.",
      });
      return;
    }
    const isConnectable = GraphService.isConnectable(thingId);
    const rabbitholeId = req.query.rabbitholeId as string;

    if (rabbitholeId && !(typeof rabbitholeId !== "string")) {
      res.status(400).send({
        message: "Bad Request",
      });
      return;
    }
    if (!isConnectable) {
      res.status(400).send({
        message: "Resource not available for this type of thing",
      });
      return;
    }
    const similar = await GraphService.getRecommendedConnectables(user.id, thingId, {
      rabbitholeId,
    });
    res.send({
      message: "Successfully got similar",
      data: similar,
    });
  } catch (error) {
    logger.error("Error fetching similar things", {
      error,
    });
    res.status(500).send({
      message: "Something went wrong",
    });
  }
});

router.get("/:thingId/tags", checkToken, disallowDisabled, async (req, res) => {
  try {
    const user = await getFromReq<IUser>(req, "user");
    if (!user) {
      res.status(403).json({ message: "Unauthorized" });
      return;
    }
    const thingId = req.params.thingId as string;
    const hasAccess = await User.checkHasAccess(user.id, thingId);
    if (!hasAccess) {
      res.status(403).send({
        message: "Unauthorized.",
      });
      return;
    }
    const isConnectable = GraphService.isConnectable(thingId);
    if (!isConnectable) {
      res.status(400).send({
        message: "Resource not available for this type of thing",
      });
      return;
    }
    const tags = await GraphService.getUserTagsForThing(thingId, user.id);
    res.send({
      message: "Successfully got tags",
      data: tags,
    });
  } catch (error) {
    res.status(500).send({
      message: "Something went wrong",
    });
  }
});

router.get("/:thingId/tags/suggested", checkToken, disallowDisabled, async (req, res) => {
  try {
    const user = await getFromReq<IUser>(req, "user");
    if (!user) {
      res.status(403).json({ message: "Unauthorized" });
      return;
    }
    const thingId = req.params.thingId as string;
    const hasAccess = await User.checkHasAccess(user.id, thingId);
    if (!hasAccess) {
      res.status(403).send({
        message: "Unauthorized.",
      });
      return;
    }
    const isConnectable = GraphService.isConnectable(thingId);
    if (!isConnectable) {
      res.status(400).send({
        message: "Resource not available for this type of thing",
      });
      return;
    }
    const tags = await GraphService.getSuggestedTags(user.id.toString(), thingId);
    res.send({
      message: "Successfully got suggested tags",
      data: tags,
    });
  } catch (error) {
    logger.error("Error fetching suggested tags", {
      error,
    });
    res.status(500).send({
      message: "Something went wrong",
    });
  }
});

router.post("/ensure-connected", checkToken, disallowDisabled, async (req, res) => {
  try {
    const user = await getFromReq<IUser>(req, "user");
    if (!user) {
      res.status(403).json({ message: "Unauthorized" });
      return;
    }

    const auth = new Authorization(user.id);

    const { source, targets } = req.body;

    if (!source || !targets || !Array.isArray(targets)) {
      res.status(400).json({
        message: "Bad Request: Missing source or invalid targets array",
      });
      return;
    }

    const hasAccessToSource = await auth.hasAccess(source);

    if (!hasAccessToSource) {
      res.status(403).json({
        message: "Unauthorized: You do not have access to the source node.",
      });
      return;
    }

    const accessibleConnections = await auth.hasAccessBulk(targets);
    if (accessibleConnections.size === 0) {
      res.status(200).json({ message: "No valid connections to create." });
      return;
    }

    await GraphService.ensureConnected(source, Array.from(accessibleConnections));

    res.status(200).json({
      message: "Connections ensured.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export default router;
