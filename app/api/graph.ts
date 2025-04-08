import { Router } from "express";
import {
  Idea,
  IIdea,
  IIdeaAsRelation,
  IIdeaDerived,
  IIdeaDerivedMap,
  IIdeaForm,
} from "../database/models/ideas";
import { RecordId } from "surrealdb";
import { getLM } from "../semantics/lm";
import { checkIsSuperuser, checkToken } from "../middleware/auth";
import { getFromReq } from "../utils/requests";
import { IUser, User } from "../database/models/user";

const router = Router();

router.get("/", checkToken, async (req, res) => {
  try {
    const user = await getFromReq<IUser>(req, "user");
    if (!user) {
      res.status(500).json({ message: "Internal Server Error" });
      return;
    }
    const filters = req.body.filters;
    const graph = await Idea.graph(user.id, filters, { computeFields: true });
    if (!graph) {
      res.status(404).json({ message: "Graph not found" });
      return;
    }
    const { edges, ideas, flags } = graph;
    res.send({
      message: "Successfully retrieved graph.",
      data: { edges, ideas, flags },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/ideas", checkToken, checkIsSuperuser, async (req, res) => {
  try {
    const filters = req.body.filters;
    const ideas = await Idea.all(filters);
    if (!ideas) {
      res.status(404).json({ error: "Ideas not found" });
      return;
    }
    res.send({ message: "Successfully retrieved ideas.", data: ideas });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/ideas/:id", checkToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await getFromReq<IUser>(req, "user");
    if (!user) {
      res.status(500).json({ message: "Internal Server Error" });
      return;
    }
    const isOwner = await Idea.checkUserOwnership(id, user.id);
    const isSuperuser = await User.checkUserHasRole(user.id, "role:superuser");
    if (!isOwner) {
      if (!isSuperuser) {
        res.status(403).json({
          message: "Unauthorized.",
        });
        return;
      }
    }
    const withRelatedIdeas = req.query.withRelatedIdeas === "true";
    const withConnections = req.query.withConnections === "true";
    const withDerived = req.query.withDerived === "true";
    const i = await Idea.get(id);
    if (!i) {
      res.status(404).json({ message: "Idea not found" });
      return;
    }
    const toSend: IIdea & {
      connections?: {
        incoming: (IIdea & { id: RecordId })[];
        outgoing: (IIdea & { id: RecordId })[];
      };
      relatedIdeas?: (IIdeaAsRelation & { id: RecordId })[];
      derived?: IIdeaDerivedMap;
    } = { ...i };
    if (withConnections) {
      const connections = await Idea.getConnections(id);
      toSend.connections = connections;
    }
    if (withRelatedIdeas && !isSuperuser) {
      const relatedIdeas = await Idea.findSimilar(user.id, id);
      toSend.relatedIdeas = relatedIdeas;
    }
    if (withDerived) {
      const derived = await Idea.getDerivedMap(id);
      toSend.derived = derived;
    }
    res.send({ message: "Successfully retrieved idea.", data: toSend });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/ideas", checkToken, async (req, res) => {
  try {
    const body = req.body;
    const user = await getFromReq<IUser>(req, "user");
    if (!user) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }
    const form = { ...body };
    if (body.generateTitle) {
      const lm = getLM();
      form.title = await lm.utils.entitle(
        form.content,
        "short and concise, fewly worded",
      );
    }
    const i = await Idea.create(
      {
        ...form,
      },
      user.id,
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

router.post("/connection", checkToken, async (req, res) => {
  try {
    const { source, target } = req.body;
    const user = await getFromReq<IUser>(req, "user");
    if (!user) {
      res.status(403).json({ message: "Unauthorized" });
      return;
    }
    const hasAccessToSource = await Idea.checkUserOwnership(source, user.id);
    const hasAccessToTarget = await Idea.checkUserOwnership(target, user.id);
    if (!hasAccessToSource || !hasAccessToTarget) {
      res.status(403).json({
        message: "Unauthorized",
      });
      return;
    }
    const connection = await Idea.connect(source, target);
    if (!connection) {
      res.status(404).json({ message: "Connection not created" });
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

router.delete("/connection", checkToken, async (req, res) => {
  try {
    const { source, target } = req.body;
    const user = await getFromReq<IUser>(req, "user");
    if (!user) {
      res.status(403).json({ message: "Unauthorized" });
      return;
    }
    const hasAccessToSource = await Idea.checkUserOwnership(source, user.id);
    const hasAccessToTarget = await Idea.checkUserOwnership(target, user.id);
    if (!hasAccessToSource || !hasAccessToTarget) {
      res.status(403).json({
        message: "Unauthorized",
      });
      return;
    }
    const connection = await Idea.disconnect(source, target);
    if (!connection) {
      res.status(404).json({ error: "Connection not deleted" });
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

router.put("/ideas/:id", checkToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await getFromReq<IUser>(req, "user");
    if (!user) {
      res.status(403).json({ message: "Unauthorized" });
      return;
    }
    const hasAccess = await Idea.checkUserOwnership(id, user.id);
    if (!hasAccess) {
      res.status(403).json({
        message: "Unauthorized",
      });
      return;
    }
    const { title, content } = req.body;
    const updater: Partial<IIdeaForm> = {};
    if (title !== undefined) {
      updater.title = title;
    }
    if (content !== undefined) {
      updater.content = content;
    }
    const i = await Idea.update(id, updater);
    if (!i) {
      res.status(404).json({ error: "Idea not updated" });
      return;
    }
    res.send({ message: "Successfully updated idea.", data: i });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/ideas/:id", checkToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await getFromReq<IUser>(req, "user");
    if (!user) {
      res.status(403).json({ message: "Unauthorized" });
      return;
    }
    const hasAccess = await Idea.checkUserOwnership(id, user.id);
    if (!hasAccess) {
      res.status(403).json({
        message: "Unauthorized",
      });
      return;
    }
    const i = await Idea.delete(id);
    if (!i) {
      res.status(404).json({ error: "Idea not deleted" });
      return;
    }
    res.send({ message: "Successfully deleted idea.", data: i });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/ideas/:id/embed", checkToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await getFromReq<IUser>(req, "user");
    if (!user) {
      res.status(403).json({ message: "Unauthorized" });
      return;
    }
    const hasAccess = await Idea.checkUserOwnership(id, user.id);
    if (!hasAccess) {
      res.status(403).json({
        message: "Unauthorized",
      });
      return;
    }
    const idea = await Idea.loadEmbeddings(id);
    if (!idea) {
      res.status(404).json({ error: "Idea not found" });
      return;
    }
    res.send({ message: "Successfully loaded embeddings.", data: idea });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/ideas/:id/similar", checkToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await getFromReq<IUser>(req, "user");
    if (!user) {
      res.status(403).json({ message: "Unauthorized" });
      return;
    }
    const hasAccess = await Idea.checkUserOwnership(id, user.id);
    if (!hasAccess) {
      res.status(403).json({
        message: "Unauthorized",
      });
      return;
    }
    const similar = await Idea.findSimilar(user.id, id);
    res.send({
      message: "Retrieved similar ideas",
      data: similar,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/ideas/search", checkToken, async (req, res) => {
  try {
    const { query } = req.body;
    const user = await getFromReq<IUser>(req, "user");
    if (!user) {
      res.status(403).json({ message: "Unauthorized" });
      return;
    }
    // Artificial wait
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const similar = await Idea.searchIdeas(user.id, query);
    if (!similar) {
      res.status(404).json({ error: "Similar ideas not found" });
      return;
    }
    res.send({ message: "Successfully found similar ideas.", data: similar });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/synchronize", checkToken, checkIsSuperuser, async (req, res) => {
  try {
    const ideas = await Idea.all();
    if (!ideas) {
      res.status(404).json({ error: "Ideas not found" });
      return;
    }
    await Idea.synchronizeEmbeddings(ideas);
    res.send({ message: "Successfully synchronized embeddings." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
