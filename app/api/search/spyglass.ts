import { Router } from "express";
import { logger } from "../../services/Logger";
import { checkToken } from "../../middleware/auth";
import { getFromReq } from "../../utils/requests";
import { ISafeUser, User } from "../../database/models/user";
import Spyglass from "../../services/Spyglass";
import { SpyglassRecord } from "../../database/models/spyglass_record";

const router = Router();

router.post("/stream", checkToken, async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).json({ message: "Unauthorized" });
      return;
    }

    const { query, scope, deepAnalysis, rabbithole, tags, date, history } =
      req.body;
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
      rabbithole,
      tags,
      date,
      history,
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
    const newRecord = await SpyglassRecord.create(user.id, recordData);

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

// router.get("/history", checkToken, async (req, res) => {
//   try {
//     const user = await getFromReq<ISafeUser>(req, "user");
//     if (!user) {
//       res.status(403).json({ error: "Unauthorized" });
//       return;
//     }

//     const page = parseInt(req.query.page as string, 10) || 1;
//     const pageSize = parseInt(req.query.pageSize as string, 10) || 10;

//     const paginatedResult = await SpyglassRecord.getHistory(
//       user.id.toString(),
//       page,
//       pageSize,
//     );

//     if (!paginatedResult) {
//       res.status(500).json({ message: "Failed to retrieve Spyglass history." });
//       return;
//     }

//     res.send({
//       message: "Spyglass history retrieved successfully",
//       data: paginatedResult,
//     });
//   } catch (error) {
//     const userIdForLogging =
//       (req as any).user?.id ||
//       "User ID not available or error occurred before user retrieval";
//     logger.error("Error in /history GET route", {
//       userId: userIdForLogging,
//       queryParams: req.query,
//       errorMessage: error instanceof Error ? error.message : String(error),
//       errorStack: error instanceof Error ? error.stack : undefined,
//     });
//     res.status(500).json({
//       message: "An unexpected error occurred while processing your request.",
//     });
//   }
// });

router.get("/history/light", checkToken, async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }
    const page = parseInt(req.query.page as string, 10) || 1;
    const pageSize = parseInt(req.query.pageSize as string, 10) || 10;

    const history = await SpyglassRecord.getHistoryLightweight(
      user.id.toString(),
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

// router.get("/history/suggest", checkToken, async (req, res) => {
//   try {
//     const user = await getFromReq<ISafeUser>(req, "user");
//     if (!user) {
//       res.status(403).json({ error: "Unauthorized" });
//       return;
//     }

//     const queryLimit = parseInt(req.query.limit as string, 10);
//     const queryPage = parseInt(req.query.page as string, 10);

//     const limit =
//       Number.isInteger(queryLimit) && queryLimit > 0 ? queryLimit : 10;
//     const page = Number.isInteger(queryPage) && queryPage > 0 ? queryPage : 1;

//     const paginatedResult = await SpyglassRecord.getHistory(
//       user.id.toString(),
//       page,
//       limit,
//     );

//     if (!paginatedResult) {
//       res
//         .status(500)
//         .json({ message: "Failed to retrieve Spyglass history suggestions." });
//       return;
//     }

//     res.send({
//       message: "Spyglass history suggestions retrieved successfully",
//       data: paginatedResult,
//     });
//   } catch (error) {
//     const userIdForLogging =
//       (req as any).user?.id ||
//       "User ID not available or error occurred before user retrieval";
//     logger.error("Error in /history/suggest GET route", {
//       userId: userIdForLogging,
//       queryParams: req.query,
//       errorMessage: error instanceof Error ? error.message : String(error),
//       errorStack: error instanceof Error ? error.stack : undefined,
//     });
//     res.status(500).json({
//       message: "An unexpected error occurred while processing your request.",
//     });
//   }
// });

router.get("/record/:spyglassId", checkToken, async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }
    const spyglassId = req.params.spyglassId;
    const canAccess = await User.checkOwns(user.id.toString(), spyglassId);
    if (!canAccess) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }
    const spyglass = await SpyglassRecord.getById(spyglassId);
    res.send({
      message: "Spyglass retrieved successfully",
      data: spyglass,
    });
  } catch (error) {
    logger.error("Something went wrong getting spyglass record", {
      error,
    });
    res.status(500).json({ message: "Something went wrong." });
  }
});

export default router;
