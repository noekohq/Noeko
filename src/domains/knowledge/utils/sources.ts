import { RecordId } from "surrealdb";
import { ISource, ISourceForm, ISourceReference } from "../../../../app/database/models/source";
import { IUserFile } from "../../../../app/database/models/userfile";
import { api } from "@infrastructure/api/client";

export const getSourceName = (source: ISource) => {
  const s = source.references as ISourceReference;
  if (s.id.toString().startsWith("user_file")) {
    const userFile = source.references as IUserFile;
    return userFile.originalFileName;
  }
};

export const createSourceFrom = async (thingId: string | RecordId) => {
  try {
    const response = await api.post("/sources/from", {
      thingId,
    });
    return response.data.data as ISource;
  } catch (error) {
    console.error("Error creating source from: ", thingId, error);
    return undefined;
  }
};

export const updateSource = async (taskId: string | RecordId, form: Partial<ISourceForm>) => {
  try {
    const result = await api.put(`/sources/${taskId.toString()}`, form);
    return result.data.data as boolean;
  } catch (error) {
    console.error("Error completing task: ", error);
    return undefined;
  }
};
