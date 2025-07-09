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
    if (!form.name) {
      res.status(400).send({
        message: "Name is required.",
      });
      return;
    }
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

router.post("/new", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).send({
        message: "Unauthorized.",
      });
      return;
    }
    const rabbithole = await Rabbithole.create(user.id, {
      name: "Unnamed Rabbithole",
    });
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

router.get("/", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).send({
        message: "Unauthorized.",
      });
      return;
    }
    const rabbitholes = await Rabbithole.getAll(user.id.toString());
    if (!rabbitholes) {
      res.status(500).send({
        message: "Internal Server Error",
      });
      return;
    }
    res.send({
      message: "Successfully retrieved rabbitholes",
      data: rabbitholes,
    });
  } catch (error) {
    res.status(500).send({
      message: "Internal Server Error",
    });
  }
});

router.get("/:rabbitholeId", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).send({
        message: "Unauthorized.",
      });
      return;
    }
    const rabbithole = await Rabbithole.get(req.params.rabbitholeId);
    if (!rabbithole) {
      res.status(404).send({
        message: "Rabbithole not found",
      });
      return;
    }
    res.send({
      message: "Successfully retrieved rabbithole",
      data: rabbithole,
    });
  } catch (error) {
    res.status(500).send({
      message: "Internal Server Error",
    });
  }
});

router.put("/:rabbitholeId", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).send({
        message: "Unauthorized.",
      });
      return;
    }
    const { name } = req.body as { name: string };
    if (!(typeof name === "string")) {
      res.status(400).send({
        message: "Invalid name. Name must be a string",
      });
      return;
    }
    const rabbithole = await Rabbithole.update(req.params.rabbitholeId, {
      name,
    });
    if (!rabbithole) {
      res.status(404).send({
        message: "Rabbithole not found",
      });
      return;
    }
    res.send({
      message: "Successfully updated rabbithole",
      data: rabbithole,
    });
  } catch (error) {
    res.status(500).send({
      message: "Internal Server Error",
    });
  }
});

router.get("/similar-ideas", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).send({
        message: "Unauthorized.",
      });
      return;
    }
  } catch (error) {
    res.status(500).send({
      message: "Internal Server Error",
    });
  }
});

export default router;
