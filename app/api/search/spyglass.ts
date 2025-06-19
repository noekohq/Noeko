import { Router } from "express";
import { logger } from "../../services/Logger";
import { checkToken } from "../../middleware/auth";
import { getFromReq } from "../../utils/requests";
import { ISpyglassSearch, SpyglassSearch } from "../../database/models/search";
import { ISafeUser } from "../../database/models/user";

const router = Router();

router.post("/", checkToken, async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }
    const query = req.body.query as string;
    const spyglass = await SpyglassSearch.runSpyglass(user.id, query);
    if (!spyglass) {
      throw new Error("Could not get results.");
    }
    const toSend: {
      data: ISpyglassSearch;
    } = {
      data: spyglass,
    };
    res.json({
      message: "Spyglass ran successfully",
      data: toSend,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/initialize", checkToken, async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }
    const { query } = req.body;
    if (!query) {
      res.status(400).json({ error: "Query is required" });
      return;
    }
    const newSpyglass = await SpyglassSearch.create(user.id, {
      baseQuery: query,
    });
    if (!newSpyglass) {
      res.status(500).json({ error: "Couldn't initiate spyglass" });
      return;
    }
    res.status(201).json({
      message: "Spyglass initiated successfully",
      data: newSpyglass,
    });
  } catch (err) {
    logger.error("Something went wrong getting user", {
      error: err,
    });
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/sse", checkToken, async (req, res) => {
  try {
    const spyglassId = req.query.spyglassId as string;
    if (!spyglassId || !(typeof spyglassId === "string")) {
      res.status(400).send({
        message: "Spyglass ID is required",
      });
      return;
    }
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }
    const canAccess = await SpyglassSearch.checkUserOwnership(
      spyglassId,
      user.id,
    );
    if (!canAccess) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }
    const spyglass = await SpyglassSearch.get(spyglassId);
    if (!spyglass) {
      res.status(404).send({
        message: "Spyglass not found",
      });
      return;
    }

    console.info("Initialized spyglass sse");
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const generator = SpyglassSearch.runSpyglassGenerator(user.id, spyglass.id);

    // Handle client disconnect
    req.on("close", () => {
      // This will cause the 'finally' block in the generator to be executed.
      generator.return(undefined);
    });

    try {
      for await (const data of generator) {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      }
    } catch (error) {
      console.error("Error streaming data:", error);
      res.end();
    }
  } catch (error) {
    console.error(error);
    logger.error("Something went wrong getting spyglass SSE", {
      error,
    });
    res.end();
  }
});

router.get("/history", checkToken, async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }
    const history = await SpyglassSearch.getHistory(user.id);
    res.send({
      message: "Spyglass history retrieved successfully",
      data: history,
    });
  } catch (error) {
    logger.error("Something went wrong getting spyglass history", {
      error,
    });
    res.status(500).json({ message: "Something went wrong." });
  }
});

router.get("/history/light", checkToken, async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }
    const history = await SpyglassSearch.getHistory(user.id);
    res.send({
      message: "Spyglass history retrieved successfully",
      data: history,
    });
  } catch (error) {
    logger.error("Something went wrong getting spyglass history", {
      error,
    });
    res.status(500).json({ message: "Something went wrong." });
  }
});

router.get("/history/suggest", checkToken, async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }
    const history = await SpyglassSearch.getHistory(user.id);
    res.send({
      message: "Spyglass history retrieved successfully",
      data: history,
    });
  } catch (error) {
    logger.error("Something went wrong getting spyglass history", {
      error,
    });
    res.status(500).json({ message: "Something went wrong." });
  }
});

router.get("/record/:spyglassId", checkToken, async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }
    const spyglassId = req.params.spyglassId;
    const canAccess = await SpyglassSearch.checkUserOwnership(
      spyglassId,
      user.id,
    );
    if (!canAccess) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }
    const spyglass = await SpyglassSearch.get(spyglassId);
    res.send({
      message: "Spyglass retrieved successfully",
      data: spyglass,
    });
  } catch (error) {
    logger.error("Something went wrong getting spyglass SSE", {
      error,
    });
    res.status(500).json({ message: "Something went wrong." });
  }
});

export default router;
