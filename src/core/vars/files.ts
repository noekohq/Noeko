import { IUserFile } from "../../../shared/types/userfile";
import { serverLocation } from "@infrastructure/api/client";
export const imagesPath = "/user_data/images";

export const fileEndpoint = (file: IUserFile) => {
  return serverLocation + `/api/files/${file.id}/`;
};

export const streamImageEndpoint = (file: IUserFile) => {
  return serverLocation + `/api/files/${file.id}/stream`;
};
