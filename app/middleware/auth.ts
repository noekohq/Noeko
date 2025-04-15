import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/crypto";
import { ISafeUser, IUser, User } from "../database/models/user";
import { addToReq, getFromReq } from "../utils/requests";

export const checkToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token = (req.headers.authorization as string)?.split(" ")[1];

    if (!token) {
      res.status(401).json({
        message: "Unauthorized",
      });
      return;
    }

    const decoded = await verifyToken<ISafeUser>(token);
    if (!decoded) {
      res.status(401).json({
        message: "Unauthorized",
      });
      return;
    }
    await addToReq(req, "user", decoded);
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const checkIsSuperuser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user || !user.roles) {
      res.status(403).json({
        message: "Forbidden",
      });
      return;
    }
    const isSuperuser = await User.checkUserHasRole(user.id, "role:superuser");
    if (isSuperuser) {
      next();
    } else {
      res.status(403).json({
        message: "Forbidden",
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const disallowDisabled = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = await getFromReq<ISafeUser>(req, "user");
    if (!user || !user.roles) {
      res.status(403).json({
        message: "Forbidden. Account is suspended.",
      });
      return;
    }
    const isDisabled = await User.isDisabled(user.id);
    if (isDisabled) {
      res.status(403).json({
        message: "Forbidden. Account is suspended.",
      });
    } else {
      next();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
