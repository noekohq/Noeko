import { NextFunction, Request, Response, Router } from "express";
import { checkToken, disallowDisabled } from "../middleware/auth";
import multer from "multer";
import { UserFile } from "../database/models/userfile";
import { getFromReq, multerToStandardFile } from "../utils/requests";
import { ISafeUser, User } from "../database/models/user";
import Authorization from "../services/Authorization";

const router = Router();

const storage = multer.memoryStorage();

const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
];

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    // The file type is allowed, so accept the file.
    cb(null, true);
  } else {
    // The file type is not allowed, so reject it with an error.
    cb(new Error("Invalid file type. Only images and PDFs are allowed."));
  }
};

const handleUpload = (req: Request, res: Response, next: NextFunction) => {
  const uploadMiddleware = upload.single("userFile");

  uploadMiddleware(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res
        .status(400)
        .json({ error: "File Upload Error", message: err.message });
    } else if (err) {
      // Handle our custom fileFilter error
      return res
        .status(400)
        .json({ error: "Bad Request", message: err.message });
    }
    next();
  });
};

const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 10, // 10MB
  },
  fileFilter: fileFilter,
});

router.post(
  "/",
  checkToken,
  disallowDisabled,
  handleUpload,
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

router.post("/embed", checkToken, disallowDisabled, async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(401).json({
        error: "Unauthorized",
        message: "User not found.",
      });
      return;
    }
    const fileId = req.body.fileId;
    const hasAccess = await User.checkHasAccess(user.id, fileId);
    if (!hasAccess) {
      res.status(403).json({
        error: "Forbidden",
        message: "User does not have access to the file.",
      });
      return;
    }
    const connectableId = req.body.connectableId;
    const hasAccessToConnectable = await User.checkHasAccess(
      user.id,
      connectableId,
    );
    if (!hasAccessToConnectable) {
      res.status(403).json({
        error: "Forbidden",
        message: "User does not have access to the connectable.",
      });
      return;
    }
    const relation = await UserFile.embedInConnectable(fileId, connectableId);
    res.status(201).json({
      message: "File embedded successfully.",
      data: relation,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Something went wrong.",
    });
  }
});

router.post("/unembed", checkToken, disallowDisabled, async (req, res) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user) {
      res.status(401).json({
        error: "Unauthorized",
        message: "User not found.",
      });
      return;
    }
    const fileId = req.body.fileId;
    const file = await UserFile.get(fileId);
    if (!file) {
      res.status(404).json({
        error: "Not Found",
        message: "File not found.",
      });
      return;
    }
    const connectableId = req.body.connectableId;
    const hasAccess = await Authorization.checkHasAccess(
      user.id,
      connectableId,
    );
    if (!hasAccess) {
      res.status(403).json({
        error: "Forbidden",
        message: "User does not have access to the connectable.",
      });
      return;
    }
    await UserFile.unembedFromConnectable(fileId, connectableId);
    res.status(200).json({
      message: "File unembedded successfully.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Something went wrong.",
    });
  }
});

router.post(
  "/ensure-embedded",
  checkToken,
  disallowDisabled,
  async (req, res) => {
    try {
      const user = await getFromReq<ISafeUser>(req, "user");
      if (!user) {
        res
          .status(401)
          .json({ error: "Unauthorized", message: "User not found." });
        return;
      }

      const { connectableId, fileIds } = req.body;

      if (!connectableId || !fileIds || !Array.isArray(fileIds)) {
        res.status(400).json({
          error: "Bad Request",
          message: "Missing connectableId or invalid fileIds array.",
        });
        return;
      }

      const canEditContainer = await Authorization.checkHasAccess(
        user.id,
        connectableId,
        "editor",
      );

      if (!canEditContainer) {
        res.status(403).json({
          error: "Forbidden",
          message: "User does not have write access to the connectable.",
        });
        return;
      }

      // 2. Bulk Check Read Access to the Source Files
      // You must already have read access to a file to link it here.
      const allowedFileIds = await Authorization.checkHasAccessBulk(
        user.id,
        fileIds,
        // No specific level required, simple view access is enough to link it
      );

      if (allowedFileIds.size === 0) {
        // If no valid files, just return success (nothing to do)
        res.status(200).json({ message: "No valid files to embed." });
        return;
      }

      // 3. Embed only the intersection
      // Convert Set to Array for the model method
      await UserFile.ensureEmbedded(connectableId, Array.from(allowedFileIds));

      res.status(200).json({
        message: "File connections ensured.",
        count: allowedFileIds.size,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Something went wrong ensuring embeddings.",
      });
    }
  },
);

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
    if (!(await UserFile.checkUserOwnership(file.id.toString(), user.id))) {
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
    if (!(await UserFile.checkUserOwnership(file.id, user.id))) {
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
    if (!(await User.checkHasAccess(user.id, file.id))) {
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
    if (!(await User.checkHasAccess(user.id.toString(), file.id.toString()))) {
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
