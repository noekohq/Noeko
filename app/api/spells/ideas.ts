import { Router } from "express";
import { getFromReq } from "../../utils/requests";
import { ISafeUser } from "../../database/models/user";
import { getLM } from "../../ai/lms/lm";

const router = Router();

export default router;
