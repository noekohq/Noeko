import { Router } from "express";
import graphRouter from "./graph";

const router = Router();

router.use("/graph", graphRouter);

export default router;
