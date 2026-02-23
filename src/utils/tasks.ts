import { showNotification } from "@mantine/notifications";
import { ITask, ITaskForm } from '../../app/database/models/task';
import { api } from '@infrastructure/api/client';
import { RecordId } from "surrealdb";

export const createTask = async (
  form: Partial<ITaskForm & { auto: boolean }>
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

export const createTaskStrict = async (form: ITaskForm): Promise<ITask | undefined> => {
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

export const updateTask = async (taskId: string | RecordId, form: Partial<ITaskForm>) => {
  try {
    const result = await api.put(`/tasks/${taskId.toString()}`, form);
    return result.data.data as boolean;
  } catch (error) {
    console.error("Error completing task: ", error);
    return undefined;
  }
};
