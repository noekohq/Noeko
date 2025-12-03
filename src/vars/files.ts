import { IUserFile } from "../../app/database/models/userfile";
import { serverLocation } from "../server/api";

export const fileEndpoint = (file: IUserFile) => {
  return serverLocation + `/api/files/${file.id}/`;
};

export const streamImageEndpoint = (file: IUserFile) => {
  return serverLocation + `/api/files/${file.id}/stream`;
};
