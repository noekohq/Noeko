import { Router } from "express";
import { checkToken, disallowDisabled } from "../middleware/auth";
import { ImporterManager } from "../services/Importer";
import { getFromReq } from "../utils/requests";
import { ISafeUser } from "../database/models/user";

const manager = new ImporterManager();

const router = Router();

router.use(checkToken, disallowDisabled);

router.post("/initialize", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(401).send({
        message: "Unauthenticated.",
      });
      return;
    }
    const created = await manager.create(user.id);
    res.send({
      message: "Initiated import instance",
      data: created.instanceId,
    });
  } catch (error) {
    console.error("Error in import initiation: ", error);
    res.status(500).send({
      message: "Internal Server Error",
    });
  }
});

router.post("/chunk/:instanceId", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(401).send({
        message: "Unauthenticated.",
      });
      return;
    }
    const instanceId = req.params.instanceId;
    const { chunk } = req.body;
    const piped = await manager.pipeChunk(instanceId, chunk);
    if (!piped) {
      res.send({
        message: "Something went wrong piping this chunk.",
        data: false,
      });
      return;
    }
    res.send({
      message: "Successfully Piped Chunk",
      data: piped,
    });
  } catch (error) {
    res
      .send({
        message: "Internal Server Error",
        data: false,
      })
      .status(500);
  }
});

router.post("/finalize/:instanceId", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(401).send({
        message: "Unauthenticated.",
      });
      return;
    }
    const instanceId = req.params.instanceId;
    const finalized = await manager.finalize(instanceId);
    if (!finalized) {
      res.status(500).send({
        message: "Something went wrong finalizing",
        data: false,
      });
      return;
    }
    res.send({
      message: "Import successfully finalized",
      data: true,
    });
  } catch (error) {
    res.send({
      message: "Internal Server Error",
      data: false,
    });
  }
});

export default router;
