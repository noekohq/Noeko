import { Router } from "express";
import { checkToken, disallowDisabled } from "../middleware/auth";
import { Share } from "../database/models/share";
import { getFromReq } from "../utils/requests";
import { User } from "../database/models/user";
import { ISafeUser } from "../../shared/types/user";
import Authorization from "../services/Authorization";

const router = Router();

router.post("/", checkToken, disallowDisabled, async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const { thingId, userId: potentiallyMissingId, email, accessLevel } = req.body;
    let userId = potentiallyMissingId;
    if (!userId && !email) {
      res.status(400).json({ message: "Missing required fields: userId or email" });
      return;
    }
    if (!userId && !!email) {
      const user = await User.findByEmail(email);
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }
      userId = user.id;
    }
    const auth = new Authorization(user.id);
    const owns = await auth.owns(thingId);
    if (!owns) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }
    const share = new Share(thingId);
    const created = await share.shareAccess(userId, accessLevel);
    res.send({
      message: "Success",
      data: created,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.put("/", checkToken, disallowDisabled, async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const { thingId, userId, accessLevel } = req.body;
    const auth = new Authorization(user.id);
    const owns = await auth.owns(thingId);
    if (!owns) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }
    const share = new Share(thingId);
    const created = await share.updateAccess(userId, accessLevel);
    res.send({
      message: "Success",
      data: created,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.delete("/", checkToken, disallowDisabled, async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const { thingId, userId } = req.body;
    const auth = new Authorization(user.id);
    const owns = await auth.owns(thingId);
    if (!owns) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }
    const share = new Share(thingId);
    const deleted = await share.revokeAccess(userId);
    res.send({
      message: "Success",
      data: deleted,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/", checkToken, disallowDisabled, async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const shares = await Share.getUserSharedThings(user.id.toString());
    res.json({
      message: "Success",
      data: shares,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/friends", checkToken, disallowDisabled, async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).json({ message: "Unauthorized" });
      return;
    }

    const friends = await User.getFriends(user.id.toString());

    res.send({
      message: "Successfully fetched friends",
      data: friends,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/:thingId", checkToken, disallowDisabled, async (req, res) => {
  try {
    const thingId = req.params.thingId as string;
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).json({ message: "Unauthorized" });
      return;
    }

    const auth = new Authorization(user.id);
    const isOwner = await auth.owns(thingId);
    if (!isOwner) {
      res.status(403).json({ message: "Unauthorized: Only the owner can view shares." });
      return;
    }

    const shares = await Share.getShares(thingId);
    if (shares === undefined) {
      res.status(500).json({ error: "An error occurred while retrieving shares." });
      return;
    }

    res.json({
      message: "Successfully retrieved shares for item.",
      data: shares,
    });
  } catch (err) {
    console.error("Error retrieving shares: ", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
