import { Router } from "express";
import { Idea } from "../database/models/idea";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const filters = req.body.filters;
    const graph = await Idea.graph();
    if (!graph) {
      res.status(404).json({ error: "Graph not found" });
      return;
    }
    const { edges, ideas } = graph;
    res.send({
      message: "Successfully retrieved graph.",
      data: { edges, ideas },
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
    res.send({ message: "Successfully retrieved ideas.", data: { ideas } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/ideas/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log("Fetching idea with id:", id);
    const i = await Idea.get(id);
    if (!i) {
      res.status(404).json({ error: "Idea not found" });
      return;
    }
    res.send({ message: "Successfully retrieved idea.", data: i });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/ideas", async (req, res) => {
  try {
    const body = req.body;
    const i = await Idea.create({
      ...body,
    });
    if (!i) {
      res.status(404).json({ error: "Idea not created" });
      return;
    }
    res.send({ message: "Successfully created idea.", data: { idea: i } });
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
      data: { connection },
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
      data: { connection },
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
    const i = await Idea.update(id, {
      title,
      content,
    });
    if (!i) {
      res.status(404).json({ error: "Idea not updated" });
      return;
    }
    res.send({ message: "Successfully updated idea.", data: { idea: i } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
