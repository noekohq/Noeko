import { RecordId } from "surrealdb";
import { api } from "../server/api";
import {
  ITag,
  ITagDescriptionRelationship,
} from "../../app/database/models/tag";
import { showNotification } from "@mantine/notifications";

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

export const createTag = async (name: string, description: string) => {
  try {
    const response = await api.post(`/tags`, {
      name,
      description,
    });
    return response.data.data as ITag;
  } catch (error: any) {
    console.error(`Error creatign tag ${name}:`, error);
    showNotification({
      title: "Error Creating Tag",
      message:
        error.response?.data?.message ||
        "Something went wrong while creating the tag.",
      color: "red",
    });
    return undefined;
  }
};

export const createTagAndAddToThing = async (
  name: string,
  description: string,
  thingId: string,
) => {
  try {
    const created = await createTag(name, description);
    if (!created) {
      throw new Error("Couldn't create tag");
    }
    const added = await applyTagToThing(thingId, created.id.toString());
    if (!added) {
      throw new Error("Couldn't add tag");
    }
    return added;
  } catch (error: any) {
    console.error(`Error creatign tag ${name}:`, error);
    showNotification({
      title: "Error Creating Tag",
      message:
        error.response?.data?.message ||
        "Something went wrong while creating the tag.",
      color: "red",
    });
    return undefined;
  }
};
