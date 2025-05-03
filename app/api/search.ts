import { Router } from "express";
import { checkToken, disallowDisabled } from "../middleware/auth";
import { getFromReq } from "../utils/requests";
import { ISafeUser } from "../database/models/user";
import { Search } from "../services/Search";
import { Embeddings } from "../semantics/embeddings";

const router = Router();

router.post("/comprehensive", checkToken, async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }
    const query = req.body.query as string;
    const limit = req.body.options as number;
    const results = await Search.comprehensiveSearch(user.id, query, {
      limit,
    });
    res.json({
      message: "Results fetched successfully",
      data: results,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/fts", checkToken, async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }
    const query = req.body.query as string;
    const results = await Search.ftsSearch(user.id, query);
    res.json({
      message: "Suggestions fetched successfully",
      data: results,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/semantic", checkToken, async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }
    const query = req.body.query as string;
    const embeddingProcessor = new Embeddings();
    const embedding = await embeddingProcessor.generateEmbeddings(query);
    if (!embedding) {
      res
        .json({
          message: "Something went wrong",
          data: [],
        })
        .status(500);
      return;
    }
    const results = await Search.semanticSearch(user.id, embedding);
    res.json({
      message: "Results fetched successfully",
      data: results,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/ideas/suggest", checkToken, async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }
    const query = req.query.query as string;
    const suggestions = await Search.suggest(user.id, query);
    res.json({
      message: "Suggestions fetched successfully",
      data: suggestions,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/ideas/suggest", checkToken, async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }
    const query = req.body.query as string;
    const suggestions = await Search.suggest(user.id, query);
    res.json({
      message: "Suggestions fetched successfully",
      data: suggestions,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.use(disallowDisabled);
export default router;
