import { Router } from "express";
import { checkToken, disallowDisabled } from "../middleware/auth";
import Exporter from "../services/Exporter";
import { getFromReq } from "../utils/requests";
import { ISafeUser } from "../../shared/types/user";

const router = Router();

router.get("/", checkToken, disallowDisabled, async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(401).send({
        message: "Unauthenticated.",
      });
      return;
    }

    const exporter = new Exporter(user.id);
    const zipBuffer = await exporter.exportToMarkdownZip();

    res.set({
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${user.firstName}-noeko-export.zip"`,
    });

    res.send(zipBuffer);
  } catch (error) {
    console.error("Error exporting stuff: ", error);
    res.status(500).send({
      message: "Something went wrong.",
    });
  }
});

export default router;
