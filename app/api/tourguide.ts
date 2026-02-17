import { checkToken, disallowDisabled } from "../middleware/auth";
import TourGuide from "../services/TourGuide";
import { Router } from "express";
import { getFromReq } from "../utils/requests";
import { ISafeUser } from "../../shared/types/user";
import Feature from "../database/models/feature";

const router = Router();

router.get("/viewed", checkToken, disallowDisabled, async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).send({
        message: "Unauthorized.",
      });
      return;
    }
    const allViewed = await Feature.allViewedBy(user.id);
    if (!allViewed) {
      res.status(404).send({
        message: "No viewed features found.",
      });
      return;
    }
    res.send({
      message: "Viewed features retrieved successfully.",
      data: allViewed,
    });
  } catch (error) {
    console.error("Error getting viewed features: ", error);
    res.status(500).send({
      message: "Something went wrong.",
    });
  }
});

router.post("/:featureId/viewed", checkToken, disallowDisabled, async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).send({
        message: "Unauthorized.",
      });
      return;
    }
    const featureId = req.params.featureId as string;
    const feature = new Feature(featureId);
    const viewedBy = await feature.viewedBy(user.id);
    if (!viewedBy) {
      res.status(500).send({
        message: "Failed to mark as viewed.",
      });
      return;
    }

    res.send({
      message: "Feature viewed successfully.",
    });
  } catch (error) {
    console.error("Error marking feature viewed: ", error);
    res.status(500).send({
      message: "Something went wrong.",
    });
  }
});

router.get("/:featureId/viewed", checkToken, disallowDisabled, async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(403).send({
        message: "Unauthorized.",
      });
      return;
    }
    const featureId = req.params.featureId as string;
    const feature = new Feature(featureId);
    const isViewed = await feature.isViewedBy(user.id);
    if (!isViewed) {
      res.status(500).send({
        message: "Failed to check is viewed.",
      });
      return;
    }

    res.send({
      message: "Feature view state checked.",
      data: isViewed,
    });
  } catch (error) {
    console.error("Error marking feature viewed: ", error);
    res.status(500).send({
      message: "Something went wrong.",
    });
  }
});

export default router;
