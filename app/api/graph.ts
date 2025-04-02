import { Router } from "express";
import {
  Idea,
  IIdea,
  IIdeaAsRelation,
  IIdeaConnection,
  IIdeaForm,
} from "../database/models/idea";
import { Embeddings } from "../semantics/embeddings";
import { RecordId } from "surrealdb";
import { getLM } from "../semantics/lm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const filters = req.body.filters;
    const graph = await Idea.graph(filters, { computeFields: true });
    if (!graph) {
      res.status(404).json({ error: "Graph not found" });
      return;
    }
    const { edges, ideas, flags } = graph;
    res.send({
      message: "Successfully retrieved graph.",
      data: { edges, ideas, flags },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/ideas", async (req, res) => {
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

router.get("/ideas/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const withRelatedIdeas = req.query.withRelatedIdeas === "true";
    const withConnections = req.query.withConnections === "true";
    const i = await Idea.get(id);
    if (!i) {
      res.status(404).json({ error: "Idea not found" });
      return;
    }
    const toSend: IIdea & {
      connections?: {
        incoming: (IIdea & { id: RecordId })[];
        outgoing: (IIdea & { id: RecordId })[];
      };
      relatedIdeas?: (IIdeaAsRelation & { id: RecordId })[];
    } = { ...i };
    if (withConnections) {
      const connections = await Idea.getConnections(id);
      toSend.connections = connections;
    }
    if (withRelatedIdeas) {
      const relatedIdeas = await Idea.findSimilar(id);
      toSend.relatedIdeas = relatedIdeas;
    }
    res.send({ message: "Successfully retrieved idea.", data: toSend });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/ideas", async (req, res) => {
  try {
    const body = req.body;
    const form = { ...body };
    if (body.generateTitle) {
      const lm = getLM();
      form.title = await lm.utils.entitle(
        form.content,
        "short and concise, fewly worded",
      );
    }
    const i = await Idea.create({
      ...form,
    });
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

router.post("/connection", async (req, res) => {
  try {
    const { source, target } = req.body;
    const connection = await Idea.connect(source, target);
    if (!connection) {
      res.status(404).json({ error: "Connection not created" });
      return;
    }
    res.send({
      message: "Successfully created connection.",
      data: connection,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/connection", async (req, res) => {
  try {
    const { source, target } = req.body;
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

router.put("/ideas/:id", async (req, res) => {
  try {
    const { id } = req.params;
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

router.post("/ideas/:id/embed", async (req, res) => {
  try {
    const { id } = req.params;
    const idea = await Idea.loadEmbeddings(id);
    if (!idea) {
      res.status(404).json({ error: "Idea not found" });
      return;
    }
    const embeddings = await Idea.loadEmbeddings(id);
    // if (!embeddings) {
    //   res.status(404).json({ error: "Embeddings not found" });
    //   return;
    // }
    res.send({ message: "Successfully loaded embeddings.", data: embeddings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/ideas/:id/similar", async (req, res) => {
  try {
    const { id } = req.params;
    const similar = await Idea.findSimilar(id);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/ideas/similar/to", async (req, res) => {
  try {
    const { query } = req.body;
    const e = new Embeddings();
    const query_embedding = await e.generateEmbeddings(query);
    const similar = await Idea.semanticSearch(query_embedding);
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

router.post("/ideas/search", async (req, res) => {
  try {
    const { query } = req.body;
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const similar = await Idea.searchIdeas(query);
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

router.post("/ideas/semantic", async (req, res) => {
  try {
    const { query } = req.body;
    const e = new Embeddings();
    const query_embedding = await e.generateEmbeddings(query);
    const similar = await Idea.semanticSearch(query_embedding);
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

router.post("/synchronize", async (req, res) => {
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
