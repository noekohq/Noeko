import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  try {
    res.send({
      message: "Server is up and running!",
    });
  } catch (error) {
    res.status(500).send({
      message: "Something went wrong checking health",
    });
  }
});

export default router;
