import { useApiQuery } from "@core/hooks/useApiQuery";
import { IUserFile } from "../../../../shared/types/userfile";

export const fileKeys = {
  all: ["files"] as const,
  lists: () => [...fileKeys.all, "list"] as const,
  detail: (fileId: string | null) => [...fileKeys.all, "detail", fileId] as const,
};

export function useFiles() {
  return useApiQuery<IUserFile[]>({
    url: "/files",
    queryKey: fileKeys.lists(),
  });
}

export default function useFile(fileId: string | null) {
  return useApiQuery<IUserFile>({
    url: fileId ? `/files/${fileId}` : null,
    queryKey: fileKeys.detail(fileId),
  });
}
