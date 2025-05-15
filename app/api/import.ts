import { Router } from "express";
import { checkToken, disallowDisabled } from "../middleware/auth";

const router = Router();

router.use(checkToken, disallowDisabled);

router.post("/initiate");

export default router;
