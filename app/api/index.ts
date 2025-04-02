import { Router } from "express";
import graphRouter from "./graph";
import userRouter from "./users";

const router = Router();

router.use("/graph", graphRouter);
router.use("/users", userRouter);

export default router;
