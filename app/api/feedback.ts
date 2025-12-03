import { Router } from "express";
import {
  checkIsSuperuser,
  checkToken,
  disallowDisabled,
} from "../middleware/auth";
import { getFromReq } from "../utils/requests";
import { IUser } from "../database/models/user";
import { Feedback, IFeedbackForm } from "../database/models/feedback";
import { RecordId } from "surrealdb";

const router = Router();

// Apply to all routes in this router
router.use(checkToken);
router.use(disallowDisabled);

// Any authenticated and non-disabled user can create feedback
router.post("/", async (req, res) => {
  try {
    const user = await getFromReq<IUser>(req, "user");
    if (!user || !user.id) {
      // Ensure user and user.id are present
      res.status(401).send({
        message: "Unauthorized. User not found or ID is missing.",
      });
      return;
    }

    const {
      content,
      consentToContact,
      status = "unaddressed",
    }: IFeedbackForm = req.body;

    if (typeof content !== "string" || content.trim() === "") {
      res.status(400).send({ message: "Content is required." });
      return;
    }
    if (typeof consentToContact !== "boolean") {
      res.status(400).send({ message: "ConsentToContact must be a boolean." });
      return;
    }
    if (!["unaddressed", "in-progress", "addressed"].includes(status)) {
      res.status(400).send({ message: "Invalid status provided." });
      return;
    }

    const feedbackData: IFeedbackForm = { content, consentToContact, status };

    const feedback = await Feedback.create(feedbackData, user.id);

    if (!feedback) {
      // Corrected logic: if feedback creation failed
      res.status(500).send({
        message: "Feedback could not be created due to a server issue.",
      });
      return;
    }

    res.status(201).send({
      // 201 for successful creation
      message: "Success! Thank you for your feedback!",
      data: feedback,
    });
  } catch (error) {
    console.error("Error creating feedback:", error); // Log the actual error on the server
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";
    res.status(500).send({
      message: "Internal Server Error",
      error: errorMessage, // Send a generic or specific error message
    });
  }
});

router.use(checkIsSuperuser);

router.get("/", async (req, res) => {
  try {
    const feedbackItems = await Feedback.getAll();
    if (!feedbackItems) {
      res.status(404).send({ message: "No feedback items found." });
      return;
    }
    res.send({
      message: "Successfully retrieved all feedback items.",
      data: feedbackItems,
    });
  } catch (error) {
    console.error("Error getting all feedback items:", error);
    res.status(500).send({
      message: "Internal Server Error",
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    });
  }
});

router.get("/open", async (req, res) => {
  try {
    const feedbackItems = await Feedback.getAllOpen();
    if (!feedbackItems) {
      res.status(404).send({ message: "No feedback items found." });
      return;
    }
    res.send({
      message: "Successfully retrieved all feedback items.",
      data: feedbackItems,
    });
  } catch (error) {
    console.error("Error getting all feedback items:", error);
    res.status(500).send({
      message: "Internal Server Error",
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    });
  }
});

// GET all "open" (unaddressed or in-progress) feedback items (superuser only)
router.get("/open", async (req, res) => {
  try {
    const openFeedbackItems = await Feedback.getAllOpen();
    // The query `SELECT * FROM feedback WHERE status != addressed;` returns an array within an array if successful,
    // even if the inner array is empty. So, we check the first element.
    if (!openFeedbackItems || !openFeedbackItems[0]) {
      res.status(404).send({ message: "No open feedback items found." });
      return;
    }
    res.send({
      message: "Successfully retrieved all open feedback items.",
      data: openFeedbackItems[0], // Send the actual array of feedback items
    });
  } catch (error) {
    console.error("Error getting open feedback items:", error);
    res.status(500).send({
      message: "Internal Server Error",
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    });
  }
});

// GET a specific feedback item by ID (superuser only)
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).send({ message: "Feedback ID is required." });
      return;
    }
    const feedbackItem = await Feedback.get(id);
    if (!feedbackItem) {
      res
        .status(404)
        .send({ message: `Feedback item with ID ${id} not found.` });
      return;
    }
    res.send({
      message: `Successfully retrieved feedback item with ID ${id}.`,
      data: feedbackItem,
    });
  } catch (error) {
    console.error(`Error getting feedback item:`, error);
    res.status(500).send({
      message: "Internal Server Error",
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    });
  }
});

// UPDATE a specific feedback item by ID (superuser only)
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).send({ message: "Feedback ID is required for update." });
      return;
    }
    const form: Partial<IFeedbackForm> = req.body;

    // Optional: Add validation for the fields in 'form'
    if (Object.keys(form).length === 0) {
      res.status(400).send({ message: "No update data provided." });
      return;
    }
    if (
      form.status &&
      !["unaddressed", "in-progress", "addressed"].includes(form.status)
    ) {
      res.status(400).send({ message: "Invalid status provided for update." });
      return;
    }
    if (
      form.content !== undefined &&
      (typeof form.content !== "string" || form.content.trim() === "")
    ) {
      res.status(400).send({ message: "Content cannot be empty." });
      return;
    }
    if (
      form.consentToContact !== undefined &&
      typeof form.consentToContact !== "boolean"
    ) {
      res.status(400).send({ message: "consentToContact must be a boolean." });
      return;
    }

    const updatedFeedback = await Feedback.update(id, form);
    if (!updatedFeedback) {
      res.status(404).send({
        message: `Feedback item with ID ${id} not found or update failed.`,
      });
      return;
    }
    res.send({
      message: `Successfully updated feedback item with ID ${id}.`,
      data: updatedFeedback,
    });
  } catch (error) {
    console.error(
      `Error updating feedback item with ID ${req.params.id}:`,
      error,
    );
    res.status(500).send({
      message: "Internal Server Error",
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    });
  }
});

// DELETE a specific feedback item by ID (superuser only)
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      res
        .status(400)
        .send({ message: "Feedback ID is required for deletion." });
      return;
    }
    const deletedFeedback = await Feedback.delete(id);
    if (!deletedFeedback) {
      res.status(404).send({
        message: `Feedback item with ID ${id} not found or delete failed.`,
      });
      return;
    }
    res.send({
      message: `Successfully deleted feedback item with ID ${id}.`,
      data: deletedFeedback, // The delete method in your model returns the deleted item
    });
  } catch (error) {
    console.error(
      `Error deleting feedback item with ID ${req.params.id}:`,
      error,
    );
    res.status(500).send({
      message: "Internal Server Error",
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    });
  }
});

export default router;
