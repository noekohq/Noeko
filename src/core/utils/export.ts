import { ISafeUser } from "@/domains/identity";
import { api } from "@infrastructure/api/client";
import { triggerDownload } from "@core/utils/helpers";

export const handleExportDownload = async (user: ISafeUser) => {
  try {
    const response = await api.get(`/exports`, {
      responseType: "blob",
    });

    const blob = response.data;
    const objectUrl = URL.createObjectURL(blob);
    triggerDownload(objectUrl, `${user.firstName}-noeko-export-${new Date().toISOString()}.zip`);
    URL.revokeObjectURL(objectUrl);
  } catch (error) {
    console.error("Error getting export: ", user, error);
    return undefined;
  }
};
