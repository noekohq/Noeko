import { Request } from "express";

export const addToReq = async <T>(req: Request, key: string, value: T) => {
  (req as Request & { [key: string]: T })[key] = value;
};

export const getFromReq = async <T>(req: Request, key: string) => {
  return (req as Request & { [key: string]: T })[key] as T | undefined;
};
