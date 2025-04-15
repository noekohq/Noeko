import { Router } from "express";
import graphRouter from "./graph";
import userRouter from "./users";
import fileRouter from "./files";
import { disallowDisabled } from "../middleware/auth";

const router = Router();

router.use("/graph", graphRouter);
router.use("/files", fileRouter);
router.use("/users", userRouter);

export default router;
