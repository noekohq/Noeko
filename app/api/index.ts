import { Router } from "express";
import graphRouter from "./graph";
import userRouter from "./users";
import fileRouter from "./files";
import { disallowDisabled } from "../middleware/auth";

const router = Router();

router.use(disallowDisabled);
router.use("/graph", graphRouter);
router.use("/users", userRouter);
router.use("/files", fileRouter);

export default router;
