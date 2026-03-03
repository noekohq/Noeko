import { showNotification } from "@mantine/notifications";
import { IRabbithole, IRabbitholeIncludes } from "../../../../app/database/models/rabbithole";
import { api } from "@infrastructure/api/client";
import { ISafeIdea } from "../../../../shared/types/idea";
import { ITag } from "../../../../app/database/models/tag";
import { ITask } from "../../../../app/database/models/task";
import { getNodeDescription } from "@infrastructure/graph/utils";
import { ISource } from "../../../../app/database/models/source";

export const newRabbithole = async () => {
  try {
    const results = await api.post("/rabbitholes/new");
    return results.data.data as IRabbithole;
  } catch (error) {
    console.error("Error creating new rabbithole.", error);
    return undefined;
  }
};

export const handleCreateNewRabbithole = async (
  cb: (rabbithole: IRabbithole) => void,
  err: (err: Error) => void
) => {
  try {
    const rabbithole = await newRabbithole();
    if (!rabbithole) {
      err(new Error("New rabbithole was not created."));
      return;
    }
    cb(rabbithole);
  } catch (error) {
    console.error("Error creating new rabbithole: ", error);
    return undefined;
  }
};

export const includeThingInRabbithole = async (rabbitholeId: string, thingId: string) => {
  try {
    return await api
      .post(`/rabbitholes/${rabbitholeId}/include`, {
        thingId,
      })
      .then(() => {
        return Promise.resolve();
      })
      .catch((error) => {
        console.error(`Something went wrong including ${thingId} in ${rabbitholeId}`, error);
        showNotification({
          title: "Something went wrong",
          message: "Something went wrong including the idea",
          color: "red",
        });
      });
  } catch (error) {
    console.error("Error creating idea connection: ", error);
  }
};

export const includeThingsInRabbithole = async (rabbitholeId: string, thingIds: string[]) => {
  try {
    return await api
      .post(`/rabbitholes/${rabbitholeId}/include/many`, {
        thingIds,
      })
      .then(() => {
        return Promise.resolve();
      })
      .catch((error) => {
        console.error(
          `Something went wrong including ${thingIds.length} things in ${rabbitholeId}`,
          error,
          thingIds
        );
        showNotification({
          title: "Something went wrong",
          message: "Something went wrong including the thing",
          color: "red",
        });
      });
  } catch (error) {
    console.error("Error creating thing: ", error);
  }
};

export const unIncludeThingInRabbithole = async (rabbitholeId: string, thingId: string) => {
  try {
    return await api
      .post(`/rabbitholes/${rabbitholeId}/uninclude`, {
        thingId,
      })
      .then(() => {
        return Promise.resolve();
      })
      .catch((error) => {
        console.error(
          `Something went wrong unincluding between ${rabbitholeId} and ${thingId}`,
          error
        );
        showNotification({
          title: "Something went wrong",
          message: "Something went wrong deleting the connection",
          color: "red",
        });
      });
  } catch (error) {
    console.error("Error creating idea connection: ", error);
  }
};

export const deleteRabbithole = async (rabbitholeId: string) => {
  try {
    return await api
      .delete(`/rabbitholes/${rabbitholeId}`)
      .then(() => {
        return Promise.resolve();
      })
      .catch((error) => {
        console.error(`Something went wrong deleting ${rabbitholeId}`, error);
        showNotification({
          title: "Something went wrong",
          message: "Something went wrong deleting the rabbithole",
          color: "red",
        });
      });
  } catch (error) {
    console.error("Error creating idea connection: ", error);
  }
};

export const getRabbitholeThingName = (thing: IRabbitholeIncludes) => {
  if (thing.id.toString().startsWith("idea")) {
    const idea = thing as ISafeIdea;
    return idea.title;
  }
  if (thing.id.toString().startsWith("tag")) {
    const tag = thing as ITag;
    return tag.name;
  }
  if (thing.id.toString().startsWith("task")) {
    const task = thing as ITask;
    return task.description;
  }
  if (thing.id.toString().startsWith("source")) {
    const file = thing as ISource;
    return file.displayName;
  }
};

export const getRabbitholeThingDescription = (thing: IRabbitholeIncludes) => {
  if (thing.id.toString().startsWith("idea")) {
    const idea = thing as ISafeIdea;
    return getNodeDescription({
      ...idea,
      type: "idea",
    });
  }
  if (thing.id.toString().startsWith("tag")) {
    const tag = thing as ITag;
    return tag.description;
  }
  if (thing.id.toString().startsWith("task")) {
    const task = thing as ITask;
    return task.description;
  }
  if (thing.id.toString().startsWith("source")) {
    const file = thing as ISource;
    return file.displayName;
  }
};
