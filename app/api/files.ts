import { Router } from "express";
import { checkToken, disallowDisabled } from "../middleware/auth";
import multer from "multer";
import { UserFile } from "../database/models/userfile";
import { getFromReq, multerToStandardFile } from "../utils/requests";
import { ISafeUser, User } from "../database/models/user";

const router = Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 10, // 10MB
  },
});

router.post(
  "/",
  checkToken,
  disallowDisabled,
  upload.single("userFile"),
  async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({
          error: "Bad Request",
          message: "No file uploaded.",
        });
        return;
      }
      const user = await getFromReq<ISafeUser>(req, "user");
      if (!user) {
        res.status(401).json({
          error: "Unauthorized",
          message: "User not found.",
        });
        return;
      }
      const standardFile = multerToStandardFile(file);
      const result = await UserFile.create(user.id, standardFile);
      if (!result) {
        res.status(500).json({
          error: "Internal Server Error",
          message: "Failed to create file.",
        });
        return;
      }
      res.status(201).json({
        message: "File created successfully.",
        data: result,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Something went wrong.",
      });
    }
  },
);

router.get("/", checkToken, disallowDisabled, async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(401).json({
        error: "Unauthorized",
        message: "User not found.",
      });
      return;
    }
    const files = await UserFile.getUserFiles(user.id);
    if (!files) {
      res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to retrieve files.",
      });
      return;
    }
    res.status(200).json({
      message: "Files retrieved successfully.",
      data: files,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Something went wrong.",
    });
  }
});

router.get("/:fileId", checkToken, disallowDisabled, async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(401).json({
        error: "Unauthorized",
        message: "User not found.",
      });
      return;
    }
    const file = await UserFile.get(req.params.fileId);
    if (!file) {
      res.status(404).json({
        error: "Not Found",
        message: "File not found.",
      });
      return;
    }
    if (!UserFile.checkUserOwnership(file.id.toString(), user.id)) {
      res.status(403).json({
        error: "Forbidden",
        message: "You do not have permission to access this file.",
      });
      return;
    }
    res.status(200).json({
      message: "File retrieved successfully.",
      data: file,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Something went wrong.",
    });
  }
});

router.delete("/:fileId", checkToken, disallowDisabled, async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(401).json({
        error: "Unauthorized",
        message: "User not found.",
      });
      return;
    }
    const file = await UserFile.get(req.params.fileId);
    if (!file) {
      res.status(404).json({
        error: "Not Found",
        message: "File not found.",
      });
      return;
    }
    if (!UserFile.checkUserOwnership(file.id, user.id)) {
      res.status(403).json({
        error: "Forbidden",
        message: "You do not have permission to access this file.",
      });
      return;
    }
    await UserFile.delete(file.id);
    res.status(200).json({
      message: "File deleted successfully.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Something went wrong.",
    });
  }
});

router.get("/:id/download", checkToken, disallowDisabled, async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(401).json({
        error: "Unauthorized",
        message: "User not found.",
      });
      return;
    }
    const file = await UserFile.get(req.params.id);
    if (!file) {
      res.status(404).json({
        error: "Not Found",
        message: "File not found.",
      });
      return;
    }
    if (!User.checkOwns(user.id, file.id)) {
      res.status(403).json({
        message: "Unauthorized.",
      });
      return;
    }
    const url = await UserFile.getDownloadLink(file.id);
    if (!url) {
      res.status(500).json({
        error: "Internal Server Error",
        message: "Something went wrong.",
      });
      return;
    }
    res.status(200).json({
      message: "File download link retrieved successfully.",
      data: url,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Something went wrong.",
    });
  }
});

router.get("/:id/stream", checkToken, disallowDisabled, async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(401).json({
        error: "Unauthorized",
        message: "User not found.",
      });
      return;
    }
    const file = await UserFile.get(req.params.id);
    if (!file) {
      res.status(404).json({
        error: "Not Found",
        message: "File not found.",
      });
      return;
    }
    if (!User.checkOwns(user.id.toString(), file.id.toString())) {
      res.status(403).json({
        error: "Forbidden",
        message: "You do not have permission to access this file.",
      });
      return;
    }
    await UserFile.streamToResponse(file.id, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Something went wrong.",
    });
  }
});

export default router;
