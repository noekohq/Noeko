import { showNotification } from "@mantine/notifications";
import { IShareAccess } from "../../app/database/models/share";
import { api } from "../server/api";

export const shareAccess = async (
  thingId: string,
  userId: string,
  accessLevel?: IShareAccess,
) => {
  try {
    return await api
      .post(`/sharing`, {
        thingId,
        userId,
        accessLevel,
      })
      .then(() => {
        return Promise.resolve();
      })
      .catch((error) => {
        console.error(
          `Something went wrong creating share between ${thingId} and ${userId}`,
          error,
        );
        showNotification({
          title: "Something went wrong",
          message: "Something went wrong sharing the thing",
          color: "red",
        });
      });
  } catch (error) {
    console.error("Error sharing thing: ", error);
  }
};

export const revokeAccess = async (thingId: string, userId: string) => {
  try {
    return await api
      .delete(`/sharing`, {
        data: {
          thingId,
          userId,
        },
      })
      .then(() => {
        return Promise.resolve();
      })
      .catch((error) => {
        console.error(
          `Something went wrong removing share between ${thingId} and ${userId}`,
          error,
        );
        showNotification({
          title: "Something went wrong",
          message: "Something went wrong unsharing the thing",
          color: "red",
        });
      });
  } catch (error) {
    console.error("Error unsharing thing: ", error);
  }
};

export const shareAccessWithEmail = async (
  thingId: string,
  email: string,
  accessLevel?: IShareAccess,
) => {
  try {
    await api.post(`/sharing`, {
      thingId,
      email,
      accessLevel,
    });
    return true;
  } catch (error) {
    console.error("Error sharing thing: ", error);
    return false;
  }
};

export const updateAccess = async (
  thingId: string,
  userId: string,
  accessLevel: IShareAccess,
) => {
  try {
    return await api
      .put(`/sharing`, {
        thingId,
        userId,
        accessLevel,
      })
      .then(() => {
        return Promise.resolve();
      })
      .catch((error) => {
        console.error(
          `Something went wrong updating share between ${thingId} and ${userId}`,
          error,
        );
        showNotification({
          title: "Something went wrong",
          message: "Something went wrong updating the share",
          color: "red",
        });
      });
  } catch (error) {
    console.error("Error updating share: ", error);
  }
};

export const getShares = async (thingId: string) => {
  try {
    const response = await api.get(`/sharing/${thingId}`);
    return response.data.data;
  } catch (error) {
    console.error(`Error getting shares for ${thingId}`, error);
    showNotification({
      title: "Something went wrong",
      message: "Could not load sharing information.",
      color: "red",
    });
    return undefined;
  }
};
