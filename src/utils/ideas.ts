import { showNotification } from "@mantine/notifications";
import {
  IIdea,
  IIdeaForm,
  IIdeaDerived,
} from "../../app/database/models/ideas";
import { api } from "../server/api";
import { IChunk } from "../../app/services/Importer";
import { IGenerativeSummary } from "../../app/database/models/ideas/summaries";

export const getDerivedMap = (idea: IIdea & { derived: IIdeaDerived }) => {
  const tableToNode: Record<string, IIdeaDerived> = {};
};

export const newIdea = async () => {
  try {
    const results = await api.post("/ideas/new");
    return results.data.data as IIdea;
  } catch (error) {
    console.error("Error creating new idea.");
    return undefined;
  }
};

export const handleCreateNewIdea = async (
  cb: (idea: IIdea) => void,
  err: (err: Error) => void,
) => {
  try {
    const idea = await newIdea();
    if (!idea) {
      err(new Error("New idea was not created."));
      return;
    }
    cb(idea);
  } catch (error) {
    console.error("Error creating new idea: ", error);
    return undefined;
  }
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

export const initializeImport = async (): Promise<string | undefined> => {
  try {
    const result = await api.post("/imports/initialize").then((d) => {
      return d.data.data as string;
    });
    return result;
  } catch (error) {
    console.error("Error initializing import: ", error);
    return undefined;
  }
};

export const uploadChunkToImport = async (importId: string, chunk: IChunk) => {
  try {
    const result = await api
      .post(`/imports/chunk/${importId}`, {
        chunk,
      })
      .then((d) => {
        return d.data.data as boolean;
      });
    return result;
  } catch (error) {
    console.error(
      `Error uploading chunk to import with id ${chunk.id}: `,
      error,
    );
    return false;
  }
};

export const finalizeImport = async (
  importId: string,
): Promise<string | undefined> => {
  try {
    const result = await api.post(`/imports/finalize/${importId}`).then((d) => {
      return d.data.data as string;
    });
    return result;
  } catch (error) {
    console.error("Error initializing import: ", error);
    return undefined;
  }
};

export const getIdeaSize = (idea: IIdeaForm | IIdea) => {
  // This is based on the rule of thumb that each character is two bytes
  return idea.content.length * 2;
};

export const getChunkSize = (chunk: IChunk): number => {
  return chunk.items.reduce((acc, curr) => {
    return acc + getIdeaSize(curr);
  }, 0);
};

export const addTagToIdea = async (ideaId: string, tagId: string) => {
  try {
    const response = await api.post(`/tags/${tagId}/ideas/${ideaId}`);
    showNotification({
      title: "Tag Added",
      message: "The tag was successfully added to the idea.",
    });
    return response.data; // Or a more specific part of the response if needed
  } catch (error: any) {
    console.error(`Error adding tag ${tagId} to idea ${ideaId}:`, error);
    showNotification({
      title: "Error Adding Tag",
      message:
        error.response?.data?.message ||
        "Something went wrong while adding the tag.",
      color: "red",
    });
    return undefined;
  }
};

export const removeTagFromIdea = async (ideaId: string, tagId: string) => {
  try {
    const response = await api.delete(`/tags/${tagId}/ideas/${ideaId}`);
    showNotification({
      title: "Tag Removed",
      message: "The tag was successfully removed from the idea.",
    });
    return response.data; // Or a more specific part of the response if needed
  } catch (error: any) {
    console.error(`Error removing tag ${tagId} from idea ${ideaId}:`, error);
    showNotification({
      title: "Error Removing Tag",
      message:
        error.response?.data?.message ||
        "Something went wrong while removing the tag.",
      color: "red",
    });
    return undefined;
  }
};

export const getChunkedIdeas = (
  ideas: IIdeaForm[],
  chunkMax: number,
): {
  chunks: IChunk[];
  tooLarge: IChunk[];
} => {
  const tooLarge: IChunk[] = [];
  const chunks: IChunk[] = [
    {
      id: "0",
      items: [],
      totalSize: 0,
    },
  ];
  let currentChunk = 0;

  const newChunk = () => {
    currentChunk++;
    chunks[currentChunk] = {
      id: `${currentChunk}`,
      items: [],
      totalSize: 0,
    };
  };

  const pushToCurrent = (idea: IIdeaForm) => {
    chunks[currentChunk].items.push(idea);
    chunks[currentChunk].totalSize = getChunkSize(chunks[currentChunk]);
  };

  for (const idea of ideas) {
    const ideaSize = getIdeaSize(idea);
    if (ideaSize > chunkMax) {
      tooLarge.push({
        id: `${tooLarge.length}`,
        items: [idea],
        totalSize: ideaSize,
      });
      continue;
    }
    const currentChunkSize = getChunkSize(chunks[currentChunk]);
    if (currentChunkSize > chunkMax) {
      newChunk();
    }
    pushToCurrent(idea);
  }

  return {
    chunks,
    tooLarge,
  };
};

export const getIdeaSummaryItemIfExists = (
  idea: IIdea,
  item: keyof IGenerativeSummary,
) => {
  const i = idea.derived?.generative_summary?.[item];
  if (!i) {
    return undefined;
  }
  return i;
};
