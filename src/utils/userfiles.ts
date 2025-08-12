import { RecordId } from "surrealdb";
import { api } from "../server/api";
import { triggerDownload } from "./helpers";
import { IUserFile } from "../../app/database/models/userfile";

export const getFileDownloadLink = async (fileId: string | RecordId) => {
  try {
    const response = await api.get(`/files/${fileId.toString()}/download`);
    const link = response.data.data;
    return link;
  } catch (error) {
    console.error("Error getting file link: ", fileId);
    return undefined;
  }
};

export const handleFileDownload = async (file: IUserFile) => {
  try {
    const fileId = file.id.toString();
    const response = await api.get(`/files/${fileId.toString()}/stream`, {
      responseType: "blob",
    });

    const blob = response.data;
    const objectUrl = URL.createObjectURL(blob);
    triggerDownload(objectUrl, file.originalFileName);
    URL.revokeObjectURL(objectUrl);
  } catch (error) {
    console.error("Error downloading file: ", file);
    return undefined;
  }
};

export const getFileDownload = async (file: IUserFile | string) => {
  try {
    const fileId = typeof file === "string" ? file : file.id.toString();
    const response = await api.get(`/files/${fileId.toString()}/stream`, {
      responseType: "blob",
    });

    const blob = response.data;
    const objectUrl = URL.createObjectURL(blob);
    return objectUrl;
  } catch (error) {
    console.error("Error downloading file: ", file);
    return undefined;
  }
};
