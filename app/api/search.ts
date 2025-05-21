import { Router } from "express";
import { checkToken, disallowDisabled } from "../middleware/auth";
import { getFromReq } from "../utils/requests";
import { ISafeUser } from "../database/models/user";
import { ISearchOverview, ISearchResult, Search } from "../services/Search";
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

router.use(disallowDisabled);
export default router;
