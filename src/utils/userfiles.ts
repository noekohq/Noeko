import { RecordId } from "surrealdb";
import { api } from "../server/api";
import { triggerDownload } from "./helpers";
import { IUserFile } from "../../app/database/models/userfile";
import { AxiosProgressEvent, isCancel } from "axios";

export interface UploadCallbacks {
  onProgress?: (percent: number) => void;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}
export const uploadFileSmart = async (file: File, callbacks: UploadCallbacks) => {
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  const STALL_TIMEOUT_MS = 30000; // 30 Seconds of silence = failure

  if (file.size > MAX_SIZE) {
    if (callbacks.onError) {
      callbacks.onError?.("File is too large. Max size is 10MB.");
    } else {
      window.alert("File is too large. Max size is 10MB.");
    }
    return;
  }

  const formData = new FormData();
  formData.append("userFile", file);

  const controller = new AbortController();

  let stallTimer: Timer | null = null;

  const resetStallTimer = () => {
    if (stallTimer) clearTimeout(stallTimer);
    stallTimer = setTimeout(() => {
      controller.abort();
      callbacks.onError?.("Upload timed out due to inactivity.");
    }, STALL_TIMEOUT_MS);
  };

  resetStallTimer();

  try {
    const response = await api.post("files", formData, {
      signal: controller.signal, // Link controller to axios
      onUploadProgress: (progressEvent: AxiosProgressEvent) => {
        resetStallTimer();

        const percent = Math.round(
          (progressEvent.loaded * 100) / (progressEvent.total || file.size)
        );
        callbacks.onProgress?.(percent);
      },
    });

    if (stallTimer) clearTimeout(stallTimer);
    callbacks.onSuccess?.(response.data.data);
    return response.data.data;
  } catch (err: any) {
    if (stallTimer) clearTimeout(stallTimer);

    // Distinguish between a Timeout/Abort and a Server Error
    if (isCancel(err)) {
      callbacks.onError?.("Upload timed out (network stalled).");
    } else {
      // Standard error (400, 500, etc)
      const message = err.response?.data?.message || "Upload failed";
      callbacks.onError?.(message);
    }
  }
};

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

export const linkFileToConnectable = async (fileId: string, connectableId: string) => {
  try {
    await api.post("/files/embed", {
      fileId: fileId,
      connectableId: connectableId,
    });
    console.info(`Linked file ${fileId} to ${connectableId}`);
  } catch (error) {
    console.error("Failed to link file to connectable:", error);
  }
};

export const unlinkFileFromConnectable = async (fileId: string, connectableId: string) => {
  try {
    await api.post("/files/unembed", {
      fileId: fileId,
      connectableId: connectableId,
    });
    console.info(`Unlinked file ${fileId} from ${connectableId}`);
  } catch (error) {
    console.error("Failed to unlink file from connectable:", error);
  }
};
