import { Router } from "express";
import graphRouter from "./graph";
import userRouter from "./users";
import fileRouter from "./files";
import searchRouter from "./search";
import feedbackRouter from "./feedback";
import { disallowDisabled } from "../middleware/auth";

const router = Router();

router.use("/graph", graphRouter);
router.use("/files", fileRouter);
router.use("/users", userRouter);
router.use("/search", searchRouter);
router.use("/feedback", feedbackRouter);

export default router;
