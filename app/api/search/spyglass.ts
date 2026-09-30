import { Router } from "express";
import { logger } from "../../services/Logger";
import { checkToken } from "../../middleware/auth";
import { getFromReq } from "../../utils/requests";
import { User } from "../../database/models/user";
import { ISafeUser } from "../../../shared/types/user";
import Spyglass from "../../services/Spyglass";
import { ISpyglassRecordForm, SpyglassRecord } from "../../database/models/spyglass_record";
import GraphService from "../../services/Graph";
import { SpyglassSaveRequestSchema, SpyglassStreamRequestSchema } from "../../utils/validation";
import { SpyglassRunCreateRequestSchema } from "../../utils/validation";
import { SpyglassRunModel } from "../../database/models/spyglass_run";
import { spyglassRunWorker } from "../../services/SpyglassRunWorker";
import { z } from "zod";

const router = Router();
const routeParam = (value: string | string[]) => (Array.isArray(value) ? value[0] : value);

const checkScopeAccess = async (userId: string, scope?: string[]) => {
  if (!scope?.length) return { allowed: true } as const;
  const invalidScope = scope.find(
    (id) =>
      !GraphService.isConnectable(id) && !GraphService.isTag(id) && !GraphService.isRabbithole(id)
  );
  if (invalidScope)
    return {
      allowed: false,
      status: 400,
      error: `Unsupported scope record: ${invalidScope}`,
    } as const;
  const access = await Promise.all(scope.map((id) => User.checkHasAccess(userId, id)));
  if (access.some((canAccess) => !canAccess)) {
    return { allowed: false, status: 403, error: "Unauthorized scope" } as const;
  }
  return { allowed: true } as const;
};

router.post("/runs", checkToken, async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }
    const validationResult = SpyglassRunCreateRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        message: "Invalid request body",
        error: z.treeifyError(validationResult.error),
      });
      return;
    }
    const { query, scope, deepAnalysis, rabbithole, tags, date, history } = validationResult.data;
    const scopeAccess = await checkScopeAccess(user.id.toString(), scope);
    if (!scopeAccess.allowed) {
      res.status(scopeAccess.status).json({ error: scopeAccess.error });
      return;
    }

    const run = await SpyglassRunModel.create({
      userId: user.id.toString(),
      query,
      profile: deepAnalysis ? "deep_focus" : "glimpse",
      configuration: { scope, rabbithole, tags, date, history },
    });
    spyglassRunWorker.dispatch(run.id);
    res.status(202).json({
      message: deepAnalysis ? "Deep Focus run queued." : "Glimpse run queued.",
      data: run,
    });
  } catch (error) {
    logger.error("Unable to queue Spyglass run", { error });
    res.status(500).json({ error: "Unable to queue Spyglass run." });
  }
});

router.get("/runs", checkToken, async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string, 10) || 20));
    const runs = await SpyglassRunModel.listForUser(user.id.toString(), page, pageSize);
    res.json({ message: "Spyglass runs retrieved successfully.", data: runs });
  } catch (error) {
    logger.error("Unable to list Spyglass runs", { error });
    res.status(500).json({ error: "Unable to list Spyglass runs." });
  }
});

router.get("/runs/:runId", checkToken, async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }
    const run = await SpyglassRunModel.getOwnedById(
      routeParam(req.params.runId),
      user.id.toString()
    );
    if (!run) {
      res.status(404).json({ error: "Spyglass run not found." });
      return;
    }
    res.json({ message: "Spyglass run retrieved successfully.", data: run });
  } catch (error) {
    logger.error("Unable to retrieve Spyglass run", { error });
    res.status(500).json({ error: "Unable to retrieve Spyglass run." });
  }
});

router.get("/runs/:runId/events", checkToken, async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }
    let run = await SpyglassRunModel.getOwnedById(routeParam(req.params.runId), user.id.toString());
    if (!run) {
      res.status(404).json({ error: "Spyglass run not found." });
      return;
    }

    const queryAfter = parseInt(req.query.after as string, 10);
    const headerAfter = parseInt(req.header("Last-Event-ID") ?? "", 10);
    let cursor = Number.isFinite(queryAfter)
      ? queryAfter
      : Number.isFinite(headerAfter)
        ? headerAfter
        : 0;
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    let disconnected = false;
    req.on("close", () => {
      disconnected = true;
    });

    while (!disconnected) {
      const events = await SpyglassRunModel.getEventsAfter(run.id, cursor);
      for (const event of events) {
        cursor = event.sequence;
        res.write(
          `id: ${event.sequence}\ndata: ${JSON.stringify({
            sequence: event.sequence,
            type: event.type,
            data: event.data,
            createdAt: event.createdAt,
          })}\n\n`
        );
      }
      run = (await SpyglassRunModel.getOwnedById(run.id, user.id.toString())) ?? run;
      if (
        ["completed", "failed", "cancelled"].includes(run.status) &&
        cursor >= run.lastEventSequence
      ) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    if (!res.writableEnded) res.end();
  } catch (error) {
    logger.error("Unable to stream Spyglass run events", { error });
    if (!res.headersSent) res.status(500).json({ error: "Unable to stream Spyglass events." });
    else if (!res.writableEnded) res.end();
  }
});

router.post("/runs/:runId/cancel", checkToken, async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }
    const run = await SpyglassRunModel.requestCancellation(
      routeParam(req.params.runId),
      user.id.toString()
    );
    if (!run) {
      res.status(409).json({ error: "Run is not active or does not exist." });
      return;
    }
    if (run.status === "queued") spyglassRunWorker.dispatch(run.id);
    res.status(202).json({ message: "Cancellation requested.", data: run });
  } catch (error) {
    logger.error("Unable to cancel Spyglass run", { error });
    res.status(500).json({ error: "Unable to cancel Spyglass run." });
  }
});

router.post("/stream", checkToken, async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).json({ message: "Unauthorized" });
      return;
    }

    const validationResult = SpyglassStreamRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        message: "Invalid request body",
        error: z.treeifyError(validationResult.error),
      });
      return;
    }

    const { query, scope, deepAnalysis, rabbithole, tags, date, history } = validationResult.data;

    const scopeAccess = await checkScopeAccess(user.id.toString(), scope);
    if (!scopeAccess.allowed) {
      res.status(scopeAccess.status).json({ error: scopeAccess.error });
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

    const validationResult = SpyglassSaveRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        message: "Invalid request body",
        error: z.treeifyError(validationResult.error),
      });
      return;
    }

    const access = await Promise.all(
      validationResult.data.scope.map((id) => User.checkHasAccess(user.id, id))
    );
    if (access.some((canAccess) => !canAccess)) {
      res.status(403).json({ error: "Unauthorized scope" });
      return;
    }

    const recordData = validationResult.data as unknown as ISpyglassRecordForm;
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

    const requested = page * pageSize;
    const [legacyHistory, durableHistory] = await Promise.all([
      SpyglassRecord.getHistoryLightweight(user.id.toString(), 1, requested),
      SpyglassRunModel.listForUser(user.id.toString(), 1, requested),
    ]);
    const durableItems = durableHistory.runs.map((run) => ({
      id: run.id,
      baseQuery: run.query,
      createdAt: run.createdAt,
      isDeepAnalysis: run.profile !== "glimpse",
      status: run.status,
    }));
    const offset = (page - 1) * pageSize;
    const combined = [...(legacyHistory?.history ?? []), ...durableItems]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(offset, offset + pageSize);
    const history = {
      history: combined,
      total: (legacyHistory?.total ?? 0) + durableHistory.total,
      limit: pageSize,
      page,
    };
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
    const spyglassId = req.params.spyglassId as string;
    if (spyglassId.startsWith(`${SpyglassRunModel.table}:`)) {
      const run = await SpyglassRunModel.getOwnedById(spyglassId, user.id.toString());
      if (!run) {
        res.status(403).json({ error: "Unauthorized" });
        return;
      }
      res.send({
        message: "Spyglass retrieved successfully",
        data: {
          id: run.id,
          createdAt: run.createdAt,
          intent: run.intent,
          baseQuery: run.query,
          scope: run.resources.map((resource) => resource.id),
          searchPerformed: !run.configuration.scope?.length,
          isDeepAnalysis: run.profile !== "glimpse",
          findings: run.findings,
          overview: run.overview,
        },
      });
      return;
    }
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
