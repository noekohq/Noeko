import { showNotification } from "@mantine/notifications";
import {
  IIdea,
  IIdeaForm,
  IIdeaDerived,
} from "../../app/database/models/ideas";
import { api } from "../server/api";
import { IChunk } from "../../app/services/Importer";
import { Cursor } from "@phosphor-icons/react";

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
