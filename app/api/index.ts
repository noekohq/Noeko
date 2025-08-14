import { Router } from "express";
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

const router = Router();

router.use("/healthcheck", healthCheckRouter);
router.use("/dashboard", dashboardRouter);
router.use("/graph", graphRouter);
router.use("/ideas", ideasRouter);
router.use("/files", fileRouter);
router.use("/users", userRouter);
router.use("/search", searchRouter);
router.use("/feedback", feedbackRouter);
router.use("/imports", importRouter);
router.use("/tags", tagRouter);
router.use("/rabbitholes", rabbitholeRouter);
router.use("/analysis", analysisRouter);
router.use("/spells", spellsRouter);
router.use("/tasks", taskRouter);
router.use("/sources", sourceRouter);

export default router;
