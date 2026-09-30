import { api } from "@infrastructure/api/client";
import type { DefaultResponse } from "@/declarations/server";
import type {
  ISemanticNeighborhoodRequest,
  ISemanticNeighborhoodResult,
} from "../../../../shared/types/semantic-neighborhood";

export async function fetchSemanticNeighborhood(
  sourceId: string,
  request: ISemanticNeighborhoodRequest,
  signal?: AbortSignal
): Promise<ISemanticNeighborhoodResult> {
  const response = await api.post<DefaultResponse<ISemanticNeighborhoodResult>>(
    `/graph/${encodeURIComponent(sourceId)}/semantic-neighbors`,
    request,
    { signal }
  );

  return response.data.data;
}
