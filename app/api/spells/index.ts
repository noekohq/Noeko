import { Router } from "express";
import { checkToken, disallowDisabled } from "../../middleware/auth";
import { getFromReq } from "../../utils/requests";
import ideaSpells from "./ideas";

const router = Router();

router.use(checkToken, disallowDisabled);

router.use("/ideas", ideaSpells);

export default router;
