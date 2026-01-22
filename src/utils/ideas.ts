import { showNotification } from "@mantine/notifications";
import {
  IIdea,
  IIdeaForm,
  IIdeaDerived,
  ISafeIdea,
} from "../../shared/types/idea";
import { IIdeaShareAccess } from "../../shared/types/share";
import { IGenerativeSummary } from "../../shared/types/idea";
import {
  ITag,
  ITagDescriptionRelationship,
} from "../../app/database/models/tag";
import { applyTagToThing } from "./tags";
import { api } from "../server/api";
import { IChunk } from "../../shared/types/importer";

export const getDerivedMap = (idea: IIdea & { derived: IIdeaDerived }) => {
  const tableToNode: Record<string, IIdeaDerived> = {};
};

export const newIdeaOptimistic = () => {
  const tempId = crypto.randomUUID();
  const optimisticIdea: any = {
    id: tempId,
    title: "Untitled Idea",
    content: "",
    embeddings: null,
    visibility: "private",
    createdAt: new Date(),
    updatedAt: new Date(),
    viewedAt: new Date(),
    contentUpdatedAt: new Date(),
    contentPlainUpdatedAt: new Date(),
    embeddingsUpdatedAt: new Date(),
    isOptimistic: true,
  };

  const promise = api
    .post("/ideas/new")
    .then((results) => results.data.data as IIdea);

  return { optimisticIdea, promise };
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

export const createIdea = async (form: { title?: string; content: string }) => {
  try {
    const results = await api.post("/ideas", {
      generateTitle: !form.title,
      title: form.title,
      content: form.content,
    });
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

export const handleCreateIdea = async (
  form: { title?: string; content: string },
  cb: (idea: IIdea) => void,
  err: (err: Error) => void,
) => {
  try {
    const idea = await createIdea(form);
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
        return Promise.resolve();
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

export const removeIdeaConnection = async (source: string, target: string) => {
  try {
    return await api
      .delete("/graph/connection", {
        data: {
          source,
          target,
        },
      })
      .then(() => {
        return Promise.resolve();
      })
      .catch((error) => {
        console.error(
          `Something went wrong deleting connection between ${source} and ${target}`,
          error,
        );
        showNotification({
          title: "Something went wrong",
          message: "Something went wrong deleting the connection",
          color: "red",
        });
      });
  } catch (error) {
    console.error("Error creating idea connection: ", error);
  }
};

export const handleCreateNewConnectedIdea = async (
  from: string,
  cb: (idea: IIdea) => void,
  err: (err: Error) => void,
) => {
  try {
    const idea = await newIdea();
    if (!idea) {
      err(new Error("New idea was not created."));
      return;
    }
    await createIdeaConnection(from, idea.id.toString()).then(() => {
      cb(idea);
    });
  } catch (error) {
    console.error("Error creating new idea: ", error);
    return undefined;
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

export const newTaggedIdea = async (tagId: string) => {
  try {
    const idea = await newIdea();
    if (idea) {
      applyTagToThing(idea.id.toString(), tagId);
    }
    return idea;
  } catch (error: any) {
    console.error(`Error adding tag ${tagId} to new idea:`, error);
    showNotification({
      title: "Error Creating Idea",
      message:
        error.response?.data?.message ||
        "Something went wrong while adding the tag.",
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

export const createIdeaShare = async (
  ideaId: string,

  userId: string,

  accessLevel?: IIdeaShareAccess,
) => {
  try {
    return await api

      .post(`/ideas/${ideaId}/share`, {
        userId,

        accessLevel,
      })
      .then(() => {
        return Promise.resolve();
      })
      .catch((error) => {
        console.error(
          `Something went wrong creating share between ${ideaId} and ${userId}`,
          error,
        );
        showNotification({
          title: "Something went wrong",
          message: "Something went wrong sharing the idea",
          color: "red",
        });
      });
  } catch (error) {
    console.error("Error sharing idea: ", error);
  }
};

export const removeIdeaShare = async (ideaId: string, userId: string) => {
  try {
    return await api
      .post(`/ideas/${ideaId}/unshare`, {
        userId,
      })
      .then(() => {
        return Promise.resolve();
      })
      .catch((error) => {
        console.error(
          `Something went wrong removing share between ${ideaId} and ${userId}`,
          error,
        );
        showNotification({
          title: "Something went wrong",
          message: "Something went wrong unsharing the idea",
          color: "red",
        });
      });
  } catch (error) {
    console.error("Error unsharing idea: ", error);
  }
};

export const createIdeaShareFromEmail = async (
  ideaId: string,
  email: string,
) => {
  try {
    return await api
      .post(`/ideas/${ideaId}/share/by_email`, {
        email,
      })
      .then(() => {
        return Promise.resolve();
      })
      .catch((error) => {
        console.error(
          `Something went wrong creating share between ${ideaId} and ${email}`,
          error,
        );
        showNotification({
          title: "Something went wrong",
          message: "Something went wrong sharing the idea",
          color: "red",
        });
      });
  } catch (error) {
    console.error("Something went wrong.");
    return undefined;
  }
};

export const ideasAreConnected = (
  first: IIdea | ISafeIdea,
  second: IIdea | string,
) => {
  if (!first.connections && !second) {
    return undefined;
  }
  const secondId = typeof second === "string" ? second : second.id.toString();
  const firstHasSecond = !!first.connections?.find(
    (c) => c.id.toString() === secondId,
  );
  return firstHasSecond;
};
