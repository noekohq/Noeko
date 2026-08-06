/*
 * Noeko Core
 * Copyright (C) 2026 Willow Web LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

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
import sharedRouter from "./shared";
import logRouter from "./logs";
import organizationRouter from "./organizations";
import voiceRouter from "./voice";

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
router.use("/sharing", sharedRouter);
router.use("/logs", logRouter);
router.use("/organizations", organizationRouter);
router.use("/voice", voiceRouter);

export default router;
