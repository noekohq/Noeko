import { Router } from "express";
import { checkIsSuperuser, checkToken } from "../middleware/auth";
import Insights from "../services/Insights";

const router = Router();

router.use(checkToken, checkIsSuperuser);

router.get("/stats", async (req, res) => {
  try {
    const insights = Insights;
  } catch (error) {
    console.error("Error fetching admin stats", error);
    res.status(500).send({
      message: "Something went wrong",
    });
  }
});
