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
