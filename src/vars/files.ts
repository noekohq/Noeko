import { IUserFile } from "../../app/database/models/userfile";

export const fileEndpoint = (file: IUserFile) => {
  return `/api/files/${file.id}/`;
};

export const streamImageEndpoint = (file: IUserFile) => {
  return `/api/files/${file.id}/stream`;
};
