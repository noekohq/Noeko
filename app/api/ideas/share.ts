import { Router } from "express";
import { getFromReq } from "../../utils/requests";
import { IUser, User } from "../../database/models/user";
import { Idea } from "../../database/models/ideas";

const router = Router();

router.get("/shared", async (req, res) => {
  try {
    const user = await getFromReq<IUser>(req, "user");
    if (!user) {
      res.status(403).json({ message: "Unauthorized" });
      return;
    }
    const ideas = await Idea.getSharedWithUser(user.id);
    if (!ideas) {
      res.status(404).json({ error: "Shared ideas not found" });
      return;
    }
    res.send({
      message: "Successfully retrieved shared ideas.",
      data: ideas,
    });
  } catch (err) {
    console.error("Error retrieving shared ideas: ", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/:ideaId/shares", async (req, res) => {
  try {
    const { ideaId } = req.params;
    const user = await getFromReq<IUser>(req, "user");
    if (!user) {
      res.status(403).json({ message: "Unauthorized" });
      return;
    }

    const isOwner = await Idea.checkUserOwnership(ideaId, user.id);
    if (!isOwner) {
      res
        .status(403)
        .json({ message: "Unauthorized: Only the owner can view shares." });
      return;
    }

    const shares = await Idea.getShares(ideaId);
    if (shares === undefined) {
      res
        .status(500)
        .json({ error: "An error occurred while retrieving shares." });
      return;
    }

    res.json({
      message: "Successfully retrieved shares for idea.",
      data: shares,
    });
  } catch (err) {
    console.error("Error retrieving shares: ", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/:ideaId/share", async (req, res) => {
  try {
    const { ideaId } = req.params;
    const { userId: userIdToShareWith } = req.body;
    const user = await getFromReq<IUser>(req, "user");

    if (!user) {
      res.status(403).json({ message: "Unauthorized" });
      return;
    }

    if (!userIdToShareWith) {
      res
        .status(400)
        .json({ message: "A `userId` must be provided in the request body." });
      return;
    }

    const isOwner = await Idea.checkUserOwnership(ideaId, user.id);
    if (!isOwner) {
      res
        .status(403)
        .json({ message: "Unauthorized: Only the owner can share an idea." });
      return;
    }

    const success = await Idea.share(ideaId, userIdToShareWith, "viewonly");

    if (!success) {
      res.status(500).json({ error: "Failed to share idea." });
      return;
    }

    res.json({ message: "Idea shared successfully." });
  } catch (err) {
    console.error("Error sharing idea: ", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/:ideaId/unshare", async (req, res) => {
  try {
    const { ideaId } = req.params;
    const { userId: userIdToUnshare } = req.body;
    const user = await getFromReq<IUser>(req, "user");

    if (!user) {
      res.status(403).json({ message: "Unauthorized" });
      return;
    }

    if (!userIdToUnshare) {
      res
        .status(400)
        .json({ message: "A `userId` must be provided in the request body." });
      return;
    }

    const isOwner = await Idea.checkUserOwnership(ideaId, user.id);
    if (!isOwner) {
      res
        .status(403)
        .json({ message: "Unauthorized: Only the owner can unshare an idea." });
      return;
    }

    await Idea.unshare(ideaId, userIdToUnshare);

    res.json({ message: "Idea unshared successfully." });
  } catch (err) {
    console.error("Error unsharing idea: ", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/:ideaId/share/by_email", async (req, res) => {
  try {
    const { ideaId } = req.params;
    const { email } = req.body;
    const user = await getFromReq<IUser>(req, "user");

    if (!user) {
      res.status(403).json({ message: "Unauthorized" });
      return;
    }

    if (!email) {
      res
        .status(400)
        .json({ message: "An `email` must be provided in the request body." });
      return;
    }

    const isOwner = await Idea.checkUserOwnership(ideaId, user.id);
    if (!isOwner) {
      res
        .status(403)
        .json({ message: "Unauthorized: Only the owner can share an idea." });
      return;
    }

    const userToShareWith = await User.findByEmail(email);
    if (!userToShareWith) {
      res.status(404).json({ message: "User with that email not found." });
      return;
    }

    const success = await Idea.share(
      ideaId,
      userToShareWith.id.toString(),
      "viewonly",
    );

    if (!success) {
      res.status(500).json({ error: "Failed to share idea." });
      return;
    }

    res.json({ message: "Idea shared successfully." });
  } catch (err) {
    console.error("Error sharing idea: ", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/shared/:ideaId", async (req, res) => {
  try {
    const { ideaId } = req.params;
    const user = await getFromReq<IUser>(req, "user");

    if (!user) {
      res.status(403).json({ message: "Unauthorized" });
      return;
    }

    const idea = await Idea.getAccessible(ideaId, user.id.toString());
    if (!idea) {
      res.status(404).json({ message: "Idea not found." });
      return;
    }

    const authors = await Idea.getIdeaOwners(ideaId, "public");

    res.json({
      message: "Idea shared successfully.",
      data: {
        idea,
        authors,
      },
    });
  } catch (error) {
    console.error("Error fetching shared idea: ", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
