import { RecordId } from "surrealdb";
import { IExcerptForm } from "../../app/database/models/excerpt";
import { api } from "../server/api";

export const createExcerpt = async (
  excerptable: string | RecordId,
  form: IExcerptForm,
) => {
  try {
    const response = await api.post(`/excerpts`, {
      note: form.note,
      sourceText: form.sourceText,
      excerptableId: excerptable.toString(),
    });
    const excerpt = response.data.data;
  } catch (error) {
    console.error("Error creating excerpt: ", excerptable, form, error);
    return undefined;
  }
};

export const editExcerpt = async (
  excerptId: string | RecordId,
  form: Partial<IExcerptForm>,
) => {
  try {
    const updates: Partial<IExcerptForm> = {};
    if (form.note) {
      updates.note = form.note;
    }
    if (form.sourceText) {
      updates.sourceText = form.sourceText;
    }
    const response = await api.put(`/excerpts/${excerptId}`, {
      ...updates,
    });
    const excerpt = response.data.data;
  } catch (error) {
    console.error("Error editing excerpt: ", excerptId, form, error);
    return undefined;
  }
};

export const deleteExcerpt = async (excerptId: string | RecordId) => {
  try {
    const response = await api.delete(`/excerpts/${excerptId}`);
    const excerpt = response.data.data;
  } catch (error) {
    console.error("Error deleting excerpt: ", excerptId, error);
    return undefined;
  }
};
