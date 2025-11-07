import { Router } from "express";
import { logger } from "../../services/Logger";
import { checkToken } from "../../middleware/auth";
import { getFromReq } from "../../utils/requests";
import { ISpyglassSearch, SpyglassSearch } from "../../database/models/search";
import { ISafeUser } from "../../database/models/user";
import Spyglass from "../../services/Spyglass";
import { SpyglassRecord } from "../../database/models/spyglass_record";

const router = Router();

// router.post("/initialize", checkToken, async (req, res) => {
//   try {
//     const user = await getFromReq<ISafeUser>(req, "user");
//     if (!user) {
//       res.status(403).json({ error: "Unauthorized" });
//       return;
//     }
//     const { query, parentId, rabbitholeId, scope } = req.body;
//     if (!query) {
//       res.status(400).json({ error: "Query is required" });
//       return;
//     }

//     if (parentId) {
//       const canAccess = await SpyglassSearch.checkUserOwnership(
//         parentId,
//         user.id,
//       );
//       if (!canAccess) {
//         res.status(403).json({ error: "Unauthorized access to parent search" });
//         return;
//       }
//     }

//     const newSpyglass = await SpyglassSearch.create(
//       user.id,
//       {
//         baseQuery: query,
//       },
//       {
//         rabbitholeId,
//         scope,
//       },
//     );
//     if (!newSpyglass) {
//       res.status(500).json({ error: "Couldn't initiate spyglass" });
//       return;
//     }

//     if (parentId) {
//       await SpyglassSearch.attachParent(newSpyglass.id, parentId);
//     }

//     res.status(201).json({
//       message: "Spyglass initiated successfully",
//       data: newSpyglass,
//     });
//   } catch (err) {
//     logger.error("Something went wrong attaching parent", {
//       error: err,
//     });
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });

// router.get("/sse", checkToken, async (req, res) => {
//   try {
//     const spyglassId = req.query.spyglassId as string;
//     if (!spyglassId || !(typeof spyglassId === "string")) {
//       res.status(400).send({
//         message: "Spyglass ID is required",
//       });
//       return;
//     }
//     const user = await getFromReq<ISafeUser>(req, "user");
//     if (!user) {
//       res.status(403).json({ error: "Unauthorized" });
//       return;
//     }
//     const canAccess = await SpyglassSearch.checkUserOwnership(
//       spyglassId,
//       user.id,
//     );
//     if (!canAccess) {
//       res.status(403).json({ error: "Unauthorized" });
//       return;
//     }
//     const spyglass = await SpyglassSearch.get(spyglassId);
//     if (!spyglass) {
//       res.status(404).send({
//         message: "Spyglass not found",
//       });
//       return;
//     }

//     console.info("Initialized spyglass sse");
//     res.setHeader("Content-Type", "text/event-stream");
//     res.setHeader("Cache-Control", "no-cache");
//     res.setHeader("Connection", "keep-alive");
//     res.flushHeaders();

//     const generator = SpyglassSearch.runSpyglassGenerator(user.id, spyglass.id);

//     // Handle client disconnect
//     req.on("close", () => {
//       // This will cause the 'finally' block in the generator to be executed.
//       generator.return(undefined);
//     });

//     try {
//       for await (const data of generator) {
//         if (res.writableEnded) {
//           console.warn(
//             "Client closed connection, but generator is still running. Breaking loop.",
//           );
//           generator.return(undefined); // Clean up the generator
//           break;
//         }
//         if (data.type === "error") {
//           res.write(`data: ${JSON.stringify(data)}\n\n`);
//           res.end();
//           return;
//         }
//         if (data.type === "completed") {
//           // 1. First, write the final data payload as usual.
//           res.write(`data: ${JSON.stringify(data)}\n\n`);

//           // 2. Then, send the special "close-stream" event to the client.
//           res.write("event: close-stream\n");
//           res.write("data: Stream finished successfully.\n\n");

//           // 3. Finally, end the response from the server side.
//           res.end();
//           return; // Exit the loop and function.
//         }
//         res.write(`data: ${JSON.stringify(data)}\n\n`);
//       }
//     } catch (error) {
//       console.error("Error streaming data:", error);
//       res.end();
//     }
//   } catch (error) {
//     console.error(error);
//     logger.error("Something went wrong getting spyglass SSE", {
//       error,
//     });
//     res.end();
//   }
// });

router.get("/history", checkToken, async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }

    const page = parseInt(req.query.page as string, 10);
    const pageSize = parseInt(req.query.pageSize as string, 10);

    const paginatedResult = await SpyglassSearch.getHistory(
      user.id,
      page,
      pageSize,
    );

    if (!paginatedResult) {
      // SpyglassSearch.getHistory is expected to log specific DB errors.
      res.status(500).json({ message: "Failed to retrieve Spyglass history." });
      return;
    }

    res.send({
      message: "Spyglass history retrieved successfully",
      data: paginatedResult,
    });
  } catch (error) {
    const userIdForLogging =
      (req as any).user?.id ||
      "User ID not available or error occurred before user retrieval";
    logger.error("Error in /history GET route", {
      userId: userIdForLogging,
      queryParams: req.query,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    res.status(500).json({
      message: "An unexpected error occurred while processing your request.",
    });
  }
});

router.get("/history/light", checkToken, async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }
    const page = parseInt(req.query.page as string, 10);
    const pageSize = parseInt(req.query.pageSize as string, 10);

    const history = await SpyglassSearch.getHistoryLightweight(
      user.id,
      page,
      pageSize,
    );
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

    const queryLimit = parseInt(req.query.limit as string, 10);
    const queryOffset = parseInt(req.query.offset as string, 10);

    // Default to 10 items per page, offset 0. Ensure non-negative and limit > 0.
    const limit =
      Number.isInteger(queryLimit) && queryLimit > 0 ? queryLimit : 10;
    const offset =
      Number.isInteger(queryOffset) && queryOffset >= 0 ? queryOffset : 0;

    const paginatedResult = await SpyglassSearch.getHistory(
      user.id,
      offset,
      limit,
    );

    if (!paginatedResult) {
      // SpyglassSearch.getHistory is expected to log specific DB errors.
      res
        .status(500)
        .json({ message: "Failed to retrieve Spyglass history suggestions." });
      return;
    }

    res.send({
      message: "Spyglass history suggestions retrieved successfully",
      data: paginatedResult, // This object includes { history: [], total: 0, limit: number, offset: number }
    });
  } catch (error) {
    const userIdForLogging =
      (req as any).user?.id ||
      "User ID not available or error occurred before user retrieval";
    logger.error("Error in /history/suggest GET route", {
      userId: userIdForLogging,
      queryParams: req.query,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    res.status(500).json({
      message: "An unexpected error occurred while processing your request.",
    });
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

router.post("/stream", checkToken, async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).json({ message: "Unauthorized" });
      return;
    }

    const { query, scope, deepAnalysis } = req.body;
    if (!query) {
      res.status(400).json({ error: "Query is required" });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const generator = Spyglass.runAnalysisGenerator({
      userId: user.id.toString(),
      query,
      scope,
      deepAnalysis,
    });

    req.on("close", () => {
      generator.return(undefined);
    });

    for await (const data of generator) {
      if (res.writableEnded) {
        generator.return(undefined);
        break;
      }
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
    res.end();
  } catch (error) {
    console.error("Error in analysis stream:", error);
    // Ensure the connection is closed properly on error
    if (!res.writableEnded) {
      res.status(500).end();
    }
  }
});

router.post("/save", checkToken, async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }

    const recordData = req.body;
    const newRecord = await SpyglassRecord.create(
      user.id.toString(),
      recordData,
    );

    if (!newRecord) {
      res.status(500).json({ error: "Failed to save analysis record." });
      return;
    }

    res.status(201).json({
      message: "Analysis record saved successfully.",
      data: newRecord,
    });
  } catch (error) {
    console.error("Error saving analysis record:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
