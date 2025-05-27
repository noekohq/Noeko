import { Router } from "express";
import { Tag, ITag, ITagForm } from "../database/models/tag";
import { Idea } from "../database/models/ideas"; // For type hinting
import { checkToken, disallowDisabled } from "../middleware/auth"; // Assuming auth middleware
import { getFromReq } from "../utils/requests"; // Assuming request utility
import { ISafeUser } from "../database/models/user"; // Assuming user type

const router = Router();

// Apply common middleware for all tag routes
router.use(checkToken);
router.use(disallowDisabled);

// --- Tag CRUD Operations ---

// Create a new tag
router.post("/", async (req, res): Promise<void> => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user || !user.id) {
      res
        .status(401)
        .json({ message: "Unauthorized. User not found or ID is missing." });
      return;
    }

    const { name, description, color } = req.body; // Added color
    if (typeof name !== "string" || name.trim() === "") {
      res.status(400).json({ message: "Tag name is required." });
      return;
    }
    if (description !== undefined && typeof description !== "string") {
      res.status(400).json({ message: "Tag description must be a string." });
      return;
    }
    // Optional: Add validation for color (e.g., regex for hex code)
    if (color !== undefined && typeof color !== "string") {
        res.status(400).json({ message: "Tag color must be a string (hex code)." });
        return;
    }

    const tagData: ITagForm = {
      name: name.trim(),
      description: description?.trim() || "",
      color: color?.trim(), // Added color
    };

    const newTag = await Tag.create(tagData, user.id);
    if (!newTag) {
      res.status(500).json({ message: "Failed to create tag." });
      return;
    }

    res
      .status(201)
      .json({ message: "Tag created successfully.", data: newTag });
  } catch (error) {
    console.error("Error creating tag:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Get all tags for the authenticated user
router.get("/", async (req, res): Promise<void> => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user || !user.id) {
      res.status(401).json({ message: "Unauthorized. User not found." });
      return;
    }

    const tags = await Tag.getUserTags(user.id);
    if (tags === undefined) {
      // Distinguish between error and no tags
      res.status(500).json({ message: "Error fetching user tags." });
      return;
    }

    res.status(200).json({ message: "User tags retrieved.", data: tags });
  } catch (error) {
    console.error("Error getting user tags:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Get a specific tag by its ID
router.get("/:tagId", async (req, res): Promise<void> => {
  try {
    const { tagId } = req.params;
    // No explicit user check here, as Tag.get itself doesn't require user context
    // However, checkToken middleware ensures user is logged in.
    // Ownership for GET can be added if tags are meant to be private.
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user || !user.id) {
      res.status(401).json({ message: "Unauthorized. User not found." });
      return;
    }

    const tag = await Tag.get(tagId);
    if (!tag) {
      res.status(404).json({ message: "Tag not found." });
      return;
    }

    // Optional: Check if the user owns this tag if tags are not public
    // const isOwner = await Tag.checkUserOwnership(tagId, user.id);
    // if (!isOwner) {
    //   return res.status(403).json({ message: "Forbidden. You do not own this tag." });
    // }

    res.status(200).json({ message: "Tag retrieved.", data: tag });
  } catch (error) {
    console.error("Error getting tag by ID:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Update an existing tag
router.put("/:tagId", async (req, res): Promise<void> => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user || !user.id) {
      res.status(401).json({ message: "Unauthorized. User not found." });
      return;
    }

    const { tagId } = req.params;
    const { name, description, color } = req.body; // Added color

    if (
      (name !== undefined &&
        (typeof name !== "string" || name.trim() === "")) ||
      (description !== undefined && typeof description !== "string") ||
      (color !== undefined && typeof color !== "string") // Added color validation
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
    if (color !== undefined) updateData.color = color.trim(); // Added color

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ message: "No update data provided." });
      return;
    }

    const updatedTag = await Tag.update(tagId, updateData);
    if (!updatedTag) {
      res.status(404).json({ message: "Tag not found or update failed." });
      return;
    }

    res
      .status(200)
      .json({ message: "Tag updated successfully.", data: updatedTag });
  } catch (error) {
    console.error("Error updating tag:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Delete a tag
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

// --- Tag-Idea Relationship Operations ---

// Get all ideas associated with a specific tag
router.get("/:tagId/ideas", async (req, res): Promise<void> => {
  try {
    const { tagId } = req.params;
    // checkToken ensures user is logged in.
    // Further authorization (e.g., user must own tag to see its ideas) can be added if needed.
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user || !user.id) {
      res.status(401).json({ message: "Unauthorized. User not found." });
      return;
    }

    // Optional: Check if the user owns this tag before allowing to see ideas
    // const isOwner = await Tag.checkUserOwnership(tagId, user.id);
    // if (!isOwner) {
    //   // Or if the tag is public, but only show ideas the user has access to
    //   return res.status(403).json({ message: "Forbidden. You do not own this tag." });
    // }

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

// Connect a tag to an idea
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
      res.status(403).json({ message: "Forbidden. You do not own this tag." });
      return;
    }

    // Optionally: Check if the idea exists and if the user has rights to modify it or associate tags with it.
    // For now, we rely on the Tag.connectToIdea method to handle existence checks if it does.
    // const idea = await Idea.get(ideaId);
    // if (!idea) {
    //    return res.status(404).json({ message: "Idea not found." });
    // }

    const relationship = await Tag.connectToIdea(tagId, ideaId);
    if (!relationship) {
      res.status(500).json({
        message:
          "Failed to connect tag to idea. Ensure both tag and idea exist.",
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

// Disconnect a tag from an idea
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

    const success = await Tag.disconnectFromIdea(tagId, ideaId);
    if (!success) {
      res.status(500).json({
        message:
          "Failed to disconnect tag from idea. The relationship might not exist.",
      });
      return;
    }

    res
      .status(200)
      .json({ message: "Tag disconnected from idea successfully." });
  } catch (error) {
    console.error("Error disconnecting tag from idea:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export default router;
