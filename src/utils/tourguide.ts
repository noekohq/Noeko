import { RecordId } from "surrealdb";
import { api } from '@/server/api';

export const markFeatureViewed = async (feature: string | RecordId) => {
  try {
    const response = await api.post(`/tourguide/${feature.toString()}/viewed`);
    return response.data.data;
  } catch (error) {
    console.error("Error marking feature viewed: ", feature, error);
    return undefined;
  }
};

export const checkFeatureViewed = async (feature: string | RecordId) => {
  try {
    const response = await api.get(`/tourguide/${feature.toString()}/viewed`);
    return response.data.data;
  } catch (error) {
    console.error("Error checking feature viewed: ", feature, error);
    return undefined;
  }
};

export const getAllViewed = async (): Promise<string[] | undefined> => {
  try {
    const response = await api.get("/tourguide/viewed");
    return response.data.data;
  } catch (error) {
    console.error("Error fetching features viewed: ", error);
    return undefined;
  }
};
