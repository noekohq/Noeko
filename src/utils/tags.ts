import { RecordId } from "surrealdb";
import { api } from "../server/api";
import { ITagDescriptionRelationship } from "../../app/database/models/tag";

export const applyTagToThing = async (
  tagId: string | RecordId,
  thingId: string | RecordId,
) => {
  try {
    const response = await api.post("/tags/apply", {
      tagId,
      thingId,
    });
    const data = response.data.data as ITagDescriptionRelationship;
    return data;
  } catch (error) {
    console.error("Error applying tag to thing: ", error);
    return undefined;
  }
};

export const removeTagFromThing = async (
  tagId: string | RecordId,
  thingId: string | RecordId,
) => {
  try {
    const response = await api.delete("/tags/apply", {
      data: {
        tagId,
        thingId,
      },
    });
    const data = response.data.data as ITagDescriptionRelationship;
    return data;
  } catch (error) {
    console.error("Error removing tag from thing: ", error);
    return undefined;
  }
};
