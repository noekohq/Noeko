import { Router } from "express";
import { checkToken, disallowDisabled } from "../middleware/auth";
import { getFromReq } from "../utils/requests";
import { ISafeUser } from "../database/models/user";
import Rabbithole from "../database/models/rabbithole";

const router = Router();

router.use(checkToken);
router.use(disallowDisabled);

router.post("/", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).send({
        message: "Unauthorized.",
      });
      return;
    }
    const form = req.body;
    const rabbithole = await Rabbithole.create(user.id, form);
    if (!rabbithole) {
      res.status(500).send({
        message: "Internal Server Error",
      });
      return;
    }
    res.send({
      message: "Successfully created rabbithole",
      data: rabbithole,
    });
  } catch (error) {
    res.status(500).send({
      message: "Internal Server Error",
    });
  }
});
