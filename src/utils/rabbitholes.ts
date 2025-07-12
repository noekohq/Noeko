import { showNotification } from "@mantine/notifications";
import { IRabbithole } from "../../app/database/models/rabbithole";
import { api } from "../server/api";

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
  err: (err: Error) => void,
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

export const includeThingInRabbithole = async (
  rabbitholeId: string,
  thingId: string,
) => {
  try {
    return await api
      .post(`/rabbitholes/${rabbitholeId}/include`, {
        thingId,
      })
      .then(() => {
        return Promise.resolve();
      })
      .catch((error) => {
        console.error(
          `Something went wrong including ${thingId} in ${rabbitholeId}`,
          error,
        );
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

export const unIncludeThingInRabbithole = async (
  rabbitholeId: string,
  thingId: string,
) => {
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
          error,
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
