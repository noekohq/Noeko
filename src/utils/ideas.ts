import { showNotification } from "@mantine/notifications";
import { IIdea, IIdeaDerived } from "../../app/database/models/ideas";
import { api } from "../server/api";

export const getDerivedMap = (idea: IIdea & { derived: IIdeaDerived }) => {
  const tableToNode: Record<string, IIdeaDerived> = {};
};

export const createIdeaConnection = async (source: string, target: string) => {
  try {
    return await api
      .post("/graph/connection", {
        source,
        target,
      })
      .then(() => {
        showNotification({
          title: "Connection created",
          message: "The connection was successfully created.",
        });
      })
      .catch((error) => {
        console.error(
          `Something went wrong creating connection between ${source} and ${target}`,
          error,
        );
        showNotification({
          title: "Something went wrong",
          message: "Something went wrong creating the connection",
          color: "red",
        });
      });
  } catch (error) {
    console.error("Error creating idea connection: ", error);
  }
};
