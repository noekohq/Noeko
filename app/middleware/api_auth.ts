import type { NextFunction, Request, Response } from "express";
import type { ApiScope } from "../../shared/types/automation";
import type { ISafeUser } from "../../shared/types/user";
import { ApiCredentialModel } from "../database/models/api_credential";
import { User } from "../database/models/user";
import { verifyToken } from "../utils/crypto";
import { addToReq, getFromReq } from "../utils/requests";

export const checkV1Auth = async (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  const [scheme, token] = header?.split(" ") ?? [];
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    res.status(401).json({
      error: { type: "authentication_error", code: "missing_token", message: "Unauthenticated" },
    });
    return;
  }

  try {
    if (token.startsWith("noeko_live_")) {
      const credential = await ApiCredentialModel.authenticate(token);
      if (!credential) {
        res.status(401).json({
          error: {
            type: "authentication_error",
            code: "invalid_token",
            message: "Unauthenticated",
          },
        });
        return;
      }
      const user = await User.get(credential.userId.toString());
      if (user.disabled) {
        res.status(403).json({
          error: {
            type: "permission_error",
            code: "account_disabled",
            message: "Account disabled",
          },
        });
        return;
      }
      await addToReq(req, "user", user);
      await addToReq(req, "apiCredential", credential);
      await addToReq(req, "actor", {
        userId: user.id.toString(),
        type: "api_credential" as const,
        actorId: credential.id.toString(),
      });
      next();
      return;
    }

    const user = await verifyToken<ISafeUser>(token);
    if (!user) {
      res.status(401).json({
        error: { type: "authentication_error", code: "invalid_token", message: "Unauthenticated" },
      });
      return;
    }
    await addToReq(req, "user", user);
    await addToReq(req, "actor", { userId: user.id.toString(), type: "interface" as const });
    next();
  } catch (error) {
    console.error("v1 authentication failed", error);
    res.status(401).json({
      error: { type: "authentication_error", code: "invalid_token", message: "Unauthenticated" },
    });
  }
};

export const requireScope = (scope: ApiScope) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const credential = await getFromReq<{ scopes: ApiScope[] }>(req, "apiCredential");
    if (!credential || credential.scopes.includes(scope)) {
      next();
      return;
    }
    res.status(403).json({
      error: {
        type: "permission_error",
        code: "missing_scope",
        message: `Credential requires the ${scope} scope`,
      },
    });
  };
};
