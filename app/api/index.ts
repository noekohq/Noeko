import { Router } from "express";
import v1Router from "./v1";
import graphRouter from "./graph";
import userRouter from "./users";
import fileRouter from "./files";
import searchRouter from "./search";
import feedbackRouter from "./feedback";
import importRouter from "./import";
import dashboardRouter from "./dashboard";
import ideasRouter from "./ideas";
import tagRouter from "./tags";
import rabbitholeRouter from "./rabbithole";
import healthCheckRouter from "./healthcheck";
import analysisRouter from "./analysis";
import spellsRouter from "./spells";
import taskRouter from "./tasks";
import sourceRouter from "./sources";
import excerptsRouter from "./excerpts";
import insightsRouter from "./insights";
import exportRouter from "./export";
import tourRouter from "./tourguide";
import pinRouter from "./pins";

const router = Router();

router.use("/v1", v1Router);

router.use("/healthcheck", healthCheckRouter);
router.use("/dashboard", dashboardRouter);
router.use("/graph", graphRouter);
router.use("/ideas", ideasRouter);
router.use("/files", fileRouter);
router.use("/users", userRouter);
router.use("/search", searchRouter);
router.use("/feedback", feedbackRouter);
router.use("/tags", tagRouter);
router.use("/rabbitholes", rabbitholeRouter);
router.use("/analysis", analysisRouter);
router.use("/spells", spellsRouter);
router.use("/tasks", taskRouter);
router.use("/sources", sourceRouter);
router.use("/excerpts", excerptsRouter);
router.use("/insights", insightsRouter);
router.use("/imports", importRouter);
router.use("/exports", exportRouter);
router.use("/tourguide", tourRouter);
router.use("/pins", pinRouter);

export default router;
