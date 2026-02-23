import { Router } from "express";
import { Tag } from "../database/models/tag";
import { ITag, ITagForm } from "../../shared/types/tags";
import { Idea } from "../database/models/ideas"; // For type hinting
import { checkToken, disallowDisabled } from "../middleware/auth"; // Assuming auth middleware
import { getFromReq } from "../utils/requests"; // Assuming request utility
import { User } from "../database/models/user"; // Assuming user type
import { ISafeUser } from "../../shared/types/user";
import { includeThingInRabbithole } from '@domains/rabbitholes/utils/rabbitholes';

const router = Router();

router.use(checkToken);
router.use(disallowDisabled);

router.post("/", async (req, res): Promise<void> => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user || !user.id) {
      res.status(401).json({ message: "Unauthorized. User not found or ID is missing." });
      return;
    }

    const { name, description, color } = req.body;
    if (typeof name !== "string" || name.trim() === "") {
      res.status(400).json({ message: "Tag name is required." });
      return;
    }
    if (description !== undefined && typeof description !== "string") {
      res.status(400).json({ message: "Tag description must be a string." });
      return;
    }
    if (color !== undefined && typeof color !== "string") {
      res.status(400).json({ message: "Tag color must be a string (hex code)." });
      return;
    }

    const tagData: Omit<ITagForm, "embeddings" | "embeddingsUpdatedAt"> = {
      name: name.trim(),
      description: description?.trim() || "",
      color: color?.trim(),
    };

    const newTag = await Tag.create(tagData, user.id);
    if (!newTag) {
      res.status(500).json({ message: "Failed to create tag." });
      return;
    }

    res.status(201).json({ message: "Tag created successfully.", data: newTag });
  } catch (error) {
    console.error("Error creating tag:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/", async (req, res): Promise<void> => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user || !user.id) {
      res.status(401).json({ message: "Unauthorized. User not found." });
      return;
    }
    const limit = parseInt(req.query.limit as string);
    const tags = await Tag.getAll(user.id, { limit });
    if (tags === undefined) {
      res.status(500).json({ message: "Error fetching user tags." });
      return;
    }

    res.status(200).json({ message: "User tags retrieved.", data: tags });
  } catch (error) {
    console.error("Error getting user tags:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/:tagId", async (req, res): Promise<void> => {
  try {
    const { tagId } = req.params;
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user || !user.id) {
      res.status(401).json({ message: "Unauthorized. User not found." });
      return;
    }

    const isOwner = await User.checkOwns(user.id, tagId);
    if (!isOwner) {
      res.status(403).json({ message: "Forbidden. You do not own this tag." });
      return;
    }

    const tag = await Tag.get(tagId);
    if (!tag) {
      res.status(404).json({ message: "Tag not found." });
      return;
    }

    res.status(200).json({ message: "Tag retrieved.", data: tag });
  } catch (error) {
    console.error("Error getting tag by ID:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.put("/:tagId", async (req, res): Promise<void> => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user || !user.id) {
      res.status(401).json({ message: "Unauthorized. User not found." });
      return;
    }

    const { tagId } = req.params;
    const { name, description, color } = req.body;

    if (
      (name !== undefined && (typeof name !== "string" || name.trim() === "")) ||
      (description !== undefined && typeof description !== "string") ||
      (color !== undefined && typeof color !== "string")
    ) {
      res.status(400).json({
        message:
          "Invalid data. Name must be a non-empty string, description must be a string, color must be a string.",
      });
      return;
    }

    const isOwner = await Tag.checkUserOwnership(tagId, user.id);
    if (!isOwner) {
      res.status(403).json({ message: "Forbidden. You do not own this tag." });
      return;
    }

    const updateData: Partial<ITagForm> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (color !== undefined) updateData.color = color.trim();

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ message: "No update data provided." });
      return;
    }

    const updatedTag = await Tag.update(tagId, updateData);
    if (!updatedTag) {
      res.status(404).json({ message: "Tag not found or update failed." });
      return;
    }

    res.status(200).json({ message: "Tag updated successfully.", data: updatedTag });
  } catch (error) {
    console.error("Error updating tag:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/apply", async (req, res): Promise<void> => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user || !user.id) {
      res.status(401).json({ message: "Unauthorized. User not found." });
      return;
    }

    const { tagId, thingId } = req.body;

    const isTagOwner = await User.checkOwns(user.id, tagId);
    if (!isTagOwner) {
      res.status(403).json({ message: "Forbidden." });
      return;
    }

    const hasThingAccess = await User.checkHasAccess(user.id, thingId);
    if (!hasThingAccess) {
      res.status(403).json({ message: "Forbidden." });
      return;
    }

    const relationship = await Tag.applyToThing(tagId, thingId);
    if (!relationship) {
      res.status(500).json({
        message: "Failed to connect tag to thing. Ensure both tag and thing exist.",
      });
      return;
    }

    res.status(200).json({
      message: "Tag connected to thing successfully.",
      data: relationship,
    });
  } catch (error) {
    console.error("Error connecting tag to thing:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.delete("/apply", async (req, res): Promise<void> => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user || !user.id) {
      res.status(401).json({ message: "Unauthorized. User not found." });
      return;
    }

    const { tagId, thingId } = req.body;

    const isTagOwner = await User.checkOwns(user.id, tagId);
    if (!isTagOwner) {
      res.status(403).json({ message: "Forbidden." });
      return;
    }

    const hasThingAccess = await User.checkHasAccess(user.id, thingId);
    if (!hasThingAccess) {
      res.status(403).json({ message: "Forbidden." });
      return;
    }

    const relationship = await Tag.removeFromThing(tagId, thingId);
    if (!relationship) {
      res.status(500).json({
        message: "Failed to disconnect tag from thing. The relationship might not exist.",
      });
      return;
    }

    res.status(200).json({
      message: "Tag disconnected from thing successfully.",
      data: relationship,
    });
  } catch (error) {
    console.error("Error disconnecting tag from thing:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.delete("/:tagId", async (req, res): Promise<void> => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user || !user.id) {
      res.status(401).json({ message: "Unauthorized. User not found." });
      return;
    }

    const { tagId } = req.params;

    const isOwner = await Tag.checkUserOwnership(tagId, user.id);
    if (!isOwner) {
      res.status(403).json({ message: "Forbidden. You do not own this tag." });
      return;
    }

    const success = await Tag.delete(tagId);
    if (!success) {
      // This could be due to tag not found or an internal deletion error.
      // Tag.delete should ideally distinguish, but for now a general failure.
      res.status(404).json({ message: "Tag not found or delete failed." });
      return;
    }

    res.status(200).json({ message: "Tag deleted successfully." });
  } catch (error) {
    console.error("Error deleting tag:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/:tagId/ideas", async (req, res): Promise<void> => {
  try {
    const { tagId } = req.params;
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user || !user.id) {
      res.status(401).json({ message: "Unauthorized. User not found." });
      return;
    }

    const isOwner = await Tag.checkUserOwnership(tagId, user.id);
    if (!isOwner) {
      res.status(403).json({ message: "Forbidden. You do not own this tag." });
      return;
    }

    const tagExists = await Tag.get(tagId);
    if (!tagExists) {
      res.status(404).json({ message: "Tag not found." });
      return;
    }

    const ideas: Idea[] | undefined = await Tag.getIdeasForTag(tagId);
    if (ideas === undefined) {
      res.status(500).json({ message: "Error fetching ideas for tag." });
      return;
    }

    res.status(200).json({ message: "Ideas for tag retrieved.", data: ideas });
  } catch (error) {
    console.error("Error getting ideas for tag:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/:tagId/things", async (req, res): Promise<void> => {
  try {
    const { tagId } = req.params;
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user || !user.id) {
      res.status(401).json({ message: "Unauthorized. User not found." });
      return;
    }

    const isOwner = await Tag.checkUserOwnership(tagId, user.id);
    if (!isOwner) {
      res.status(403).json({ message: "Forbidden. You do not own this tag." });
      return;
    }

    const tagExists = await Tag.get(tagId);
    if (!tagExists) {
      res.status(404).json({ message: "Tag not found." });
      return;
    }

    const things = await Tag.getTagThings(tagId);
    if (things === undefined) {
      res.status(500).json({ message: "Error fetching things for tag." });
      return;
    }

    res.status(200).json({ message: "Things for tag retrieved.", data: things });
  } catch (error) {
    console.error("Error getting things for tag:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/:tagId/ideas/:ideaId", async (req, res): Promise<void> => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user || !user.id) {
      res.status(401).json({ message: "Unauthorized. User not found." });
      return;
    }

    const { tagId, ideaId } = req.params;

    const isTagOwner = await Tag.checkUserOwnership(tagId, user.id);
    if (!isTagOwner) {
      res.status(403).json({ message: "Forbidden." });
      return;
    }

    const isIdeaOwner = await Idea.checkUserOwnership(ideaId, user.id);
    if (!isIdeaOwner) {
      res.status(403).json({ message: "Forbidden." });
      return;
    }

    const relationship = await Tag.connectToIdea(tagId, ideaId);
    if (!relationship) {
      res.status(500).json({
        message: "Failed to connect tag to idea. Ensure both tag and idea exist.",
      });
      return;
    }

    res.status(200).json({
      message: "Tag connected to idea successfully.",
      data: relationship,
    });
  } catch (error) {
    console.error("Error connecting tag to idea:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.delete("/:tagId/ideas/:ideaId", async (req, res): Promise<void> => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user || !user.id) {
      res.status(401).json({ message: "Unauthorized. User not found." });
      return;
    }

    const { tagId, ideaId } = req.params;

    const isTagOwner = await Tag.checkUserOwnership(tagId, user.id);
    if (!isTagOwner) {
      res.status(403).json({ message: "Forbidden. You do not own this tag." });
      return;
    }

    const isIdeaOwner = await Idea.checkUserOwnership(ideaId, user.id);
    if (!isIdeaOwner) {
      res.status(403).json({ message: "Forbidden." });
      return;
    }

    const success = await Tag.disconnectFromIdea(tagId, ideaId);
    if (!success) {
      res.status(500).json({
        message: "Failed to disconnect tag from idea. The relationship might not exist.",
      });
      return;
    }

    res.status(200).json({ message: "Tag disconnected from idea successfully." });
  } catch (error) {
    console.error("Error disconnecting tag from idea:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/:tagId/similar-ideas", async (req, res): Promise<void> => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user || !user.id) {
      res.status(401).json({ message: "Unauthorized. User not found." });
      return;
    }

    const { tagId } = req.params;
    const { limit, threshold } = req.query;

    let parsedLimit: number | undefined = undefined;
    if (limit) {
      parsedLimit = parseInt(limit as string, 10);
      if (isNaN(parsedLimit) || parsedLimit <= 0) {
        res.status(400).json({
          message: "Invalid limit parameter. Must be a positive integer.",
        });
        return;
      }
    }

    let parsedThreshold: number | undefined = undefined;
    if (threshold) {
      parsedThreshold = parseFloat(threshold as string);
      if (isNaN(parsedThreshold) || parsedThreshold < 0 || parsedThreshold > 1) {
        res.status(400).json({
          message: "Invalid threshold parameter. Must be a float between 0 and 1.",
        });
        return;
      }
    }

    const isOwner = await Tag.checkUserOwnership(tagId, user.id);
    if (!isOwner) {
      res.status(403).json({ message: "Forbidden. You do not own this tag." });
      return;
    }

    // Ensure tag exists and has embeddings before calling the search function
    const tagExists = await Tag.get(tagId);
    if (!tagExists) {
      res.status(404).json({ message: "Tag not found." });
      return;
    }
    if (!tagExists.embeddings || tagExists.embeddings.length === 0) {
      // Send a 200 with empty data as no comparison can be made, or 400 if it's a bad request
      res.status(200).json({
        message: "Tag has no embeddings to compare, no similar ideas found.",
        data: [],
      });
      return;
    }

    const options = {
      limit: parsedLimit,
      threshold: parsedThreshold, // getSimilarIdeasToTag will apply a default if undefined
    };

    const similarIdeas = await Tag.getSimilarIdeasToTag(tagId, user.id, options);

    if (similarIdeas === undefined) {
      // This indicates an internal error within Tag.getSimilarIdeasToTag, not just "no results"
      res.status(500).json({ message: "Error fetching similar ideas for the tag." });
      return;
    }

    res.status(200).json({
      message: "Successfully retrieved similar ideas for the tag.",
      data: similarIdeas, // This will be an empty array if no ideas meet the criteria
    });
  } catch (error) {
    console.error(`Error getting similar ideas for tag ${req.params.tagId}:`, error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/:tagId/suggestions", async (req, res): Promise<void> => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user || !user.id) {
      res.status(401).json({ message: "Unauthorized. User not found." });
      return;
    }

    const { tagId } = req.params;
    const { limit, threshold } = req.query;

    let parsedLimit: number | undefined = undefined;
    if (limit) {
      parsedLimit = parseInt(limit as string, 10);
      if (isNaN(parsedLimit) || parsedLimit <= 0) {
        res.status(400).json({
          message: "Invalid limit parameter. Must be a positive integer.",
        });
        return;
      }
    }

    let parsedThreshold: number | undefined = undefined;
    if (threshold) {
      parsedThreshold = parseFloat(threshold as string);
      if (isNaN(parsedThreshold) || parsedThreshold < 0 || parsedThreshold > 1) {
        res.status(400).json({
          message: "Invalid threshold parameter. Must be a float between 0 and 1.",
        });
        return;
      }
    }

    const isOwner = await User.checkOwns(user.id, tagId);
    if (!isOwner) {
      res.status(403).json({ message: "Forbidden. You do not own this tag." });
      return;
    }

    // Ensure tag exists and has embeddings before calling the search function
    const tagExists = await Tag.get(tagId);
    if (!tagExists) {
      res.status(404).json({ message: "Tag not found." });
      return;
    }
    if (!tagExists.embeddings || tagExists.embeddings.length === 0) {
      res.status(200).json({
        message: "Tag has no embeddings to compare, no similar ideas found.",
        data: [],
      });
      return;
    }

    const options = {
      limit: parsedLimit,
      threshold: parsedThreshold,
    };

    const similarThings = await Tag.getSimilarThings(user.id, tagId, options);

    if (similarThings === undefined) {
      res.status(500).json({ message: "Error fetching similar ideas for the tag." });
      return;
    }

    res.status(200).json({
      message: "Successfully retrieved similar ideas for the tag.",
      data: similarThings,
    });
  } catch (error) {
    console.error(`Error getting similar ideas for tag ${req.params.tagId}:`, error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/similar_to/idea/:ideaId", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user || !user.id) {
      res.status(401).json({ message: "Unauthorized. User not found." });
      return;
    }
    const ideaId = req.params.ideaId;
    const userOwns = await Idea.checkUserOwnership(ideaId, user.id);
    if (!userOwns) {
      res.status(403).send({
        message: "Unauthorized.",
      });
      return;
    }
    const similar: ITag[] | undefined = await Tag.getSimilarToIdea(user.id, ideaId);
    if (!similar) {
      throw new Error("Couldn't get similar.");
    }
    res.send({
      message: "Got similar tags to idea",
      data: similar,
    });
  } catch (error) {
    console.error("Error finding similar tags to idea:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/:tagId/firstN", async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user || !user.id) {
      res.status(401).json({ message: "Unauthorized. User not found." });
      return;
    }
    const tagId = req.params.tagId;
    const userOwns = User.checkOwns(user.id, tagId);
    if (!userOwns) {
      res.status(403).send({
        message: "Unauthorized.",
      });
      return;
    }
    const { k = 3 } = req.query as { k: number | undefined };
    const firstK = await Tag.getFirstKDescribed(tagId, k);
    if (!firstK) {
      throw new Error("Couldn't get first n.");
    }
    res.send({
      message: "Got first n tags",
      data: firstK,
    });
  } catch (error) {
    console.error("Error finding first n tags:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export default router;
