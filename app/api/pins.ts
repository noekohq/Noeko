import { Router } from "express";
import { checkToken, disallowDisabled } from "../middleware/auth";
import { getFromReq } from "../utils/requests";
import { ISafeUser } from "../database/models/user";
import Pin from "../database/models/pin";

const router = Router();

router.use(checkToken, disallowDisabled);

router.get("/", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(401).send({ message: "Unauthorized" });
      return;
    }
    const pins = await Pin.getUserPins(user.id.toString());
    if (!pins || pins.length === 0) {
      res.status(404).send({ message: "No pins found" });
      return;
    }
    res.status(200).send({
      message: "Successfully retrieved pins",
      data: pins,
    });
  } catch (error) {
    console.error("Couldn't get pins: ", error);
    res.status(500).send({ message: "Something went wrong" });
  }
});

router.get("/things", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(401).send({ message: "Unauthorized" });
      return;
    }
    const pins = await Pin.getUserPinnedThings(user.id.toString());
    if (!(pins && pins.length >= 0)) {
      res.status(404).send({ message: "No pins found" });
      return;
    }
    res.status(200).send({
      message: "Successfully retrieved pins",
      data: pins,
    });
  } catch (error) {
    console.error("Couldn't get pins: ", error);
    res.status(500).send({ message: "Something went wrong" });
  }
});

router.post("/", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(401).send({ message: "Unauthorized" });
      return;
    }
    const { thingId } = req.body;
    const pin = await Pin.pinThing(user.id, thingId);
    res.status(201).send({
      message: "Successfully created pin",
      data: pin,
    });
  } catch (error) {
    console.error("Couldn't create pin: ", error);
    res.status(500).send({ message: "Something went wrong" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(401).send({ message: "Unauthorized" });
      return;
    }
    const { id } = req.params;
    const pin = await Pin.unpinThing(id);
    if (!pin) {
      res.status(404).send({ message: "Pin not found" });
      return;
    }
    res.status(200).send({
      message: "Successfully deleted pin",
      data: pin,
    });
  } catch (error) {
    console.error("Couldn't delete pin: ", error);
    res.status(500).send({ message: "Something went wrong" });
  }
});

export default router;
