import { Router } from "express";
import { checkToken, disallowDisabled } from "../../middleware/auth";
import { getFromReq } from "../../utils/requests";
import { ISafeUser } from "../../../shared/types/user";
import { Search } from "../../services/Search";
import {
  IConnectableSearchQuery,
  ISearchResult,
  ITagSearchResult,
} from "../../../shared/types/search";
import { ISearchOverview } from "../../database/models/search";
import { getEmbedder } from "../../ai/embeddings/embeddings";
import { ITag } from "../../../shared/types/tags";
import spyglassRouter from "./spyglass";
import { IRabbithole } from "../../../shared/types/rabbithole";
import z from "zod";
import { ConnectableSearchQuerySchema } from "../../utils/validation";

const router = Router();

router.use("/spyglass", spyglassRouter);

router.post("/", checkToken, async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }

    const validationResult = ConnectableSearchQuerySchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        message: "Invalid request body",
        error: z.treeifyError(validationResult.error),
      });
      return;
    }

    const searchQuery = validationResult.data as IConnectableSearchQuery;

    const results = await Search.searchConnectables(user.id.toString(), searchQuery);

    res.send({
      message: "Succesfully searched",
      data: results,
    });
  } catch (error) {
    console.error("Error searching: ", error);
    res.status(500).send({
      message: "Something went wrong",
    });
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
    if (typeof query !== "string") {
      res.status(400).send({
        message: "Query must be a string!",
      });
      return;
    }
    const rabbitholeId = req.query.rabbitholeId as string;
    const limit = parseInt(req.query.limit as string) || 5;
    const suggestions = await Search.smartSuggest(user.id, query, {
      rabbitholeId,
      limit,
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

    const results: ITagSearchResult[] = await Search.ftsSearchTags(user.id, query, { limit });
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
      res.status(500).json({ message: "Failed to generate embeddings for query", data: [] });
      return;
    }

    const results: ITagSearchResult[] = await Search.semanticSearchTags(user.id, embedding, {
      limit,
      threshold,
    });
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

    const results: ITagSearchResult[] = await Search.comprehensiveSearchTags(user.id, query, {
      limit,
    });
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
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

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
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

    const suggestions: IRabbithole[] = await Search.suggestRabbitholes(user.id, query, {
      limit,
    });
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
