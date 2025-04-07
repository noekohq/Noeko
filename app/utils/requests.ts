import { Request, Response } from "express";

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
  });
};

export const getRefreshTokenFromReq = async (req: Request) => {
  const refreshToken = req.cookies.refreshToken;
  return refreshToken as string | undefined;
};
