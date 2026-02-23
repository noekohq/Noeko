import { uploadFileSmart, linkFileToConnectable } from '@/utils/userfiles';
import { streamImageEndpoint } from '@/vars/files';

export interface DreamUploadOptions {
  allowedTypes?: string[];
  connectableId?: string;
}

export interface UploadCallbacks {
  onProgress?: (percent: number) => void;
  onSuccess?: (remoteFile: any) => void;
  onError?: (errorMessage: string) => void;
}

export interface UploadedFileData {
  fileId: string;
  fileName: string;
  fileType: string;
  isImage: boolean;
  src: string;
}

/**
 * Uploads a file headlessly (without creating editor nodes).
 * Returns a promise that resolves with the uploaded file data.
 *
 * This is useful for:
 * - Gallery uploads where you need the URL to store in attributes
 * - Custom handling of uploaded files
 */
export const uploadDreamFileHeadless = (
  file: File,
  options: DreamUploadOptions = {},
  callbacks?: UploadCallbacks
): Promise<UploadedFileData> => {
  return new Promise((resolve, reject) => {
    if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
      const errorMsg = `File type ${file.type} is not allowed.`;
      if (options.connectableId) {
        console.error(errorMsg);
      } else {
        window.alert(errorMsg);
      }
      reject(new Error(errorMsg));
      return;
    }

    const isImage = file.type.startsWith("image/");
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    uploadFileSmart(file, {
      onProgress: (percent) => {
        callbacks?.onProgress?.(percent);
      },
      onSuccess: (remoteFile) => {
        const uploadedData: UploadedFileData = {
          fileId: remoteFile.id.toString(),
          fileName: remoteFile.originalFileName || file.name,
          fileType: remoteFile.mimeType || file.type,
          isImage,
          src: isImage ? streamImageEndpoint(remoteFile) : "",
        };

        // Link to connectable if provided
        if (options.connectableId) {
          linkFileToConnectable(remoteFile.id.toString(), options.connectableId);
        }

        callbacks?.onSuccess?.(remoteFile);
        resolve(uploadedData);
      },
      onError: (errorMessage) => {
        callbacks?.onError?.(errorMessage);
        reject(new Error(errorMessage));
      },
    });
  });
};

/**
 * Uploads multiple files headlessly.
 * Returns a promise that resolves with an array of uploaded file data.
 */
export const uploadDreamFilesHeadless = (
  files: File[],
  options: DreamUploadOptions = {},
  callbacks?: UploadCallbacks & {
    onFileProgress?: (fileIndex: number, percent: number) => void;
  }
): Promise<UploadedFileData[]> => {
  const promises = files.map((file, index) => {
    return uploadDreamFileHeadless(file, options, {
      onProgress: (percent) => callbacks?.onFileProgress?.(index, percent),
      onSuccess: callbacks?.onSuccess,
      onError: callbacks?.onError,
    });
  });

  return Promise.all(promises);
};
