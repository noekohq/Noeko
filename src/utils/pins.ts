import { RecordId } from "surrealdb";
import { api } from '@infrastructure/api/client';
import { IPin } from '../../app/database/models/pin';

export async function createPin(thingId: string | RecordId) {
  try {
    const response = await api.post("/pins", {
      thingId,
    });
    const pin = response.data.data as IPin;
    return pin;
  } catch (error) {
    console.error("Couldn't create pin: ", error);
    return undefined;
  }
}

export async function deletePin(pinId: string | RecordId) {
  try {
    const response = await api.delete(`/pins/${pinId.toString()}`);
    const pin = response.data.data as IPin;
    return pin;
  } catch (error) {
    console.error("Couldn't delete pin: ", error);
    return undefined;
  }
}
