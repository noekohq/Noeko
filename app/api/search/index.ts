import { Router } from "express";
import { checkToken, disallowDisabled } from "../../middleware/auth";
import { getFromReq } from "../../utils/requests";
import { ISafeUser } from "../../database/models/user";
import {
  ISearchResult,
  Search,
  ITagSearchResult, // Added for tag search results
} from "../../services/Search";
import { ISearchOverview } from "../../database/models/search";
import { getEmbedder } from "../../ai/embeddings/embeddings";
import { ITag } from "../../database/models/tag";
import spyglassRouter from "./spyglass";
import { IRabbithole } from "../../database/models/rabbithole";

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
    const rabbitholeId = req.body.rabbitholeId as string | undefined;
    const results = await Search.comprehensiveSearch(user.id, query, {
      limit,
      rabbitholeId,
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
    res.json({
      message: "Results fetched successfully",
      data: toSend,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/suggest", checkToken, async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }
    const query = req.query.query as string;
    const rabbitholeId = req.query.rabbitholeId as string;
    const suggestions = await Search.suggest(user.id, query, {
      rabbitholeId,
    });
    res.json({
      message: "Suggestions fetched successfully",
      data: suggestions,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/smartSuggest", checkToken, async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }
    const query = req.query.query as string;
    const rabbitholeId = req.query.rabbitholeId as string;
    const suggestions = await Search.smartSuggest(user.id, query, {
      rabbitholeId,
    });
    res.json({
      message: "Suggestions fetched successfully",
      data: suggestions,
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
    const rabbitholeId = req.query.rabbitholeId as string;
    const suggestions = await Search.ftsSearchIdeas(user.id, query, {
      rabbitholeId,
    });
    const ideas = suggestions
      ?.map((suggestion) => {
        return suggestion.value.type === "idea" ? suggestion.value : null;
      })
      .filter((idea) => idea !== null);
    res.json({
      message: "Suggestions fetched successfully",
      data: ideas,
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
    const rabbitholeId = req.body.rabbitholeId as string | undefined;
    const suggestions = await Search.suggest(user.id, query, {
      rabbitholeId,
    });
    res.json({
      message: "Suggestions fetched successfully",
      data: suggestions,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
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

router.get("/rabbitholes/suggest", checkToken, async (req, res) => {
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

    const suggestions: IRabbithole[] = await Search.suggestRabbitholes(
      user.id,
      query,
      {
        limit,
      },
    );
    res.json({
      message: "Rabbithole suggestions fetched successfully",
      data: suggestions,
    });
  } catch (error) {
    console.error("Error in /rabbitholes/suggest:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.use(disallowDisabled);
export default router;
