import { Router } from "express";

const router = Router();

router.get("/", async (req, res) => {
  res.send({
    message: "You've reached the Noeko Developer API :)",
  });
});

export default router;
