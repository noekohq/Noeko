import { StringRecordId } from "surrealdb";

export function validateSurrealRecordId(recordId: string) {
  try {
    const newId = new StringRecordId(recordId);
    if (!newId) {
      return false;
    }
  } catch (error) {
    return false;
  }
}
