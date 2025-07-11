import { Router } from "express";
import { checkToken, disallowDisabled } from "../../middleware/auth";
import { getFromReq } from "../../utils/requests";
import { ISafeUser } from "../../database/models/user";
import {
  ISearchOverview,
  ISearchResult,
  Search,
  ITagSearchResult, // Added for tag search results
} from "../../services/Search";
import { getEmbedder } from "../../ai/embeddings/embeddings";
import { ITag } from "../../database/models/tag";
import spyglassRouter from "./spyglass";

const router = Router();

router.use("/spyglass", spyglassRouter);

router.post("/comprehensive", checkToken, async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }
    const query = req.body.query as string;
    const limit = req.body.options as number;
    const withOverview = req.body.withOverview as boolean;
    const results = await Search.comprehensiveSearch(user.id, query, {
      limit,
    });
    if (!results) {
      throw new Error("Could not get results.");
    }
    const toSend: {
      results: ISearchResult[];
      overview: ISearchOverview | undefined;
    } = {
      results,
      overview: undefined,
    };
    if (withOverview) {
      toSend.overview = await Search.getOverviewFromResults(query, results);
    }
    res.json({
      message: "Results fetched successfully",
      data: toSend,
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
    const embeddingProcessor = getEmbedder();
    const embedding = await embeddingProcessor.embedContent(query);
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

router.post("/overview", checkToken, async (req, res) => {
  try {
    const { query, results } = req.body;
    if (!(typeof query === "string")) {
      res.status(400).send({
        message: "Query must be a string",
      });
      return;
    }
    if (!(typeof results === "object" && Array.isArray(results))) {
      res.status(400).send({
        message: "Results must be a string of search results",
      });
      return;
    }
    const overview = await Search.getOverviewFromResults(query, results);
    res.send({
      message: "Successfully generated overview",
      data: overview,
    });
  } catch (error) {
    console.error("Error fetching search overview: ", error);
  }
});

router.post("/tags/fts", checkToken, async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }
    const query = req.body.query as string;
    if (typeof query !== "string") {
      res.status(400).json({ error: "Query must be a string" });
      return;
    }
    const limit = req.body.options?.limit as number | undefined;

    const results: ITagSearchResult[] = await Search.ftsSearchTags(
      user.id,
      query,
      { limit },
    );
    res.json({
      message: "Tag FTS results fetched successfully",
      data: results,
    });
  } catch (error) {
    console.error("Error in /tags/fts:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/tags/semantic", checkToken, async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }
    const query = req.body.query as string;
    if (typeof query !== "string") {
      res.status(400).json({ error: "Query must be a string" });
      return;
    }
    const limit = req.body.options?.limit as number | undefined;
    const threshold = req.body.options?.threshold as number | undefined;

    const embeddingProcessor = getEmbedder();
    const embedding = await embeddingProcessor.embedContent(query);
    if (!embedding) {
      res
        .status(500)
        .json({ message: "Failed to generate embeddings for query", data: [] });
      return;
    }

    const results: ITagSearchResult[] = await Search.semanticSearchTags(
      user.id,
      embedding,
      { limit, threshold },
    );
    res.json({
      message: "Tag semantic results fetched successfully",
      data: results,
    });
  } catch (error) {
    console.error("Error in /tags/semantic:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/tags/comprehensive", checkToken, async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }
    const query = req.body.query as string;
    if (typeof query !== "string") {
      res.status(400).json({ error: "Query must be a string" });
      return;
    }
    const limit = req.body.options?.limit as number | undefined;

    const results: ITagSearchResult[] = await Search.comprehensiveSearchTags(
      user.id,
      query,
      { limit },
    );
    res.json({
      message: "Tag comprehensive results fetched successfully",
      data: results,
    });
  } catch (error) {
    console.error("Error in /tags/comprehensive:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/tags/suggest", checkToken, async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }
    const query = req.query.query as string;
    if (typeof query !== "string") {
      res.status(400).json({ error: "Query must be a string" });
      return;
    }
    const limit = req.query.limit
      ? parseInt(req.query.limit as string, 10)
      : undefined;

    const suggestions: ITag[] = await Search.suggestTags(user.id, query, {
      limit,
    });
    res.json({
      message: "Tag suggestions fetched successfully",
      data: suggestions,
    });
  } catch (error) {
    console.error("Error in /tags/suggest:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.use(disallowDisabled);
export default router;
