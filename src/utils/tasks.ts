import { showNotification } from "@mantine/notifications";
import { ITask, ITaskForm } from "../../app/database/models/task";
import { api } from "../server/api";
import { RecordId } from "surrealdb";

export const createTask = async (
  form: ITaskForm,
): Promise<ITask | undefined> => {
  try {
    const result = await api.post("/tasks", form);
    const data = await result.data.data;
    return data as ITask;
  } catch (error) {
    console.error("Error creating task: ", error);
    showNotification({
      title: "Something went wrong",
      message: "Error creating notification :/",
    });
  }
};

export const completeTask = async (
  taskId: string | RecordId,
): Promise<boolean, undefined> => {
  try {
    const result = await api.post(`/tasks/${taskId.toString()}/complete`);
    return result.data.data as boolean;
  } catch (error) {
    console.error("Error completing task: ", error);
    return undefined;
  }
};
