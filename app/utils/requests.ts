import { Request, Response } from "express";

const { NODE_ENV } = process.env;
if (!NODE_ENV) {
  throw Error("NODE_ENV not defined in .env");
}

export const addToReq = async <T>(req: Request, key: string, value: T) => {
  (req as Request & { [key: string]: T })[key] = value;
};

export const getFromReq = async <T>(req: Request, key: string) => {
  return (req as Request & { [key: string]: T })[key] as T | undefined;
};

export const addRefreshTokenToRes = async (
  res: Response,
  refreshToken: string,
) => {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: NODE_ENV === "production" ? "lax" : "none",
  });
};

export const addAccessTokenToRes = async (
  res: Response,
  accessToken: string,
) => {
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: NODE_ENV === "production" ? "lax" : "none",
  });
};

export const getRefreshTokenFromReq = async (req: Request) => {
  const refreshToken = req.cookies?.refreshToken;
  return refreshToken as string | undefined;
};

export const getAccessTokenFromReq = async (req: Request) => {
  const tokenInAuthorization = (req.headers.authorization as string)?.split(
    " ",
  )[1];
  if (tokenInAuthorization) {
    return tokenInAuthorization;
  }
  const tokenInQuery = req.query.accessToken as string;
  if (tokenInQuery) {
    return tokenInQuery;
  }
  const tokenInCookies = req.cookies?.accessToken as string;
  if (tokenInCookies) {
    return tokenInCookies;
  }
  return undefined;
};

export const multerToStandardFile = (multerFile: Express.Multer.File): File => {
  const newFile = new File([multerFile.buffer], multerFile.originalname, {
    type: multerFile.mimetype,
  });
  return newFile;
};
