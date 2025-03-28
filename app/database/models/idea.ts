import { RecordId, RecordIdValue, StringRecordId } from "surrealdb";
import { getDatabase } from "../db";
import { Embeddings } from "../../semantics/embeddings";
import { getLM } from "../../semantics/lm";

export type IIdea = {
  id: string;
  title: string;
  content: string;
  contentSummary: string;
  embeddings: number[] | null;
  createdAt: Date;
  updatedAt: Date;
  contentUpdatedAt: Date;
  embeddingsUpdatedAt: Date;
};

export type IIdeaWithComputedFields = IIdea & {
  embeddingsOutOfDate: boolean;
};

export type IIdeaAsRelation = IIdea & {
  distance: number;
};

export type IIdeaForm = Omit<IIdea, "id">;

export type IIdeaConnection = {
  id: string;
  in: string;
  out: string;
};

export type IDBGraph = {
  ideas: IIdea[];
  edges: IIdeaConnection[];
};

export type IDBGraphWithComputedFields = IDBGraph & {
  ideas: IIdeaWithComputedFields[];
};

export type SearchResult = {
  score: number;
  idea: IIdea;
  highlightText: string; // Placeholder for potential future implementation
};

export class Idea {
  constructor() {}

  static attachComputedFields(idea: IIdea): IIdeaWithComputedFields {
    return {
      ...idea,
      embeddingsOutOfDate:
        new Date(idea.contentUpdatedAt) < new Date(idea.embeddingsUpdatedAt),
    };
  }

  static attachComputedFieldsToCollection(
    ideas: IIdea[],
  ): IIdeaWithComputedFields[] {
    return ideas.map(Idea.attachComputedFields);
  }

  static async create(form: IIdeaForm) {
    try {
      const db = await getDatabase();
      const result = await db?.create<
        IIdea,
        IIdeaForm & {
          createdAt: Date;
          updatedAt: Date;
          embeddingsUpdatedAt: Date;
        }
      >("idea", {
        title: form.title,
        content: form.content,
        contentSummary:
          (await Idea.generateSummary(form.content)) ||
          "Summary not available.",
        embeddings: null,
        contentUpdatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        embeddingsUpdatedAt: new Date(),
      });
      if (!result) {
        console.error("No idea created.");
        return undefined;
      }
      const [idea] = result;
      await Idea.loadEmbeddings(idea.id.toString());
      return result;
    } catch (err) {
      console.error(err);
      return undefined;
    }
  }

  static async get(id: string) {
    try {
      const db = await getDatabase();
      const result = await db?.select<IIdea>(new StringRecordId(id));
      if (!result) {
        console.error(`Idea with id ${id} not found.`);
        return;
      }
      return result;
    } catch (err) {
      console.error(err);
      return undefined;
    }
  }

  static async all(filters: any) {
    try {
      const db = await getDatabase();
      const result = await db?.select<IIdea>("idea");
      if (!result) {
        console.error("No ideas found.");
        return undefined;
      }
      return result;
    } catch (err) {
      console.error(err);
      return undefined;
    }
  }

  static async graph(
    filters?:
      | {
          highlightedNode?: string;
        }
      | "none",
    options?: { computeFields: boolean },
  ) {
    try {
      const db = await getDatabase();
      const ideas = await db?.select<IIdea>("idea");
      if (!ideas) {
        console.error("No ideas found.");
        return undefined;
      }
      const edges = await db?.select<IIdeaConnection>("connected");
      if (options?.computeFields) {
        const computedIdeas = Idea.attachComputedFieldsToCollection(ideas);
        return {
          ideas: computedIdeas,
          edges,
        } as IDBGraphWithComputedFields;
      }
      return { ideas, edges } as IDBGraph;
    } catch (err) {
      console.error(err);
      return undefined;
    }
  }

  static async update(id: string, form: Partial<IIdeaForm>) {
    try {
      const db = await getDatabase();
      const updater: Partial<IIdeaForm> & { contentUpdatedAt?: Date } = form;
      if (form.content !== undefined) {
        updater.contentUpdatedAt = new Date();
        updater.contentSummary =
          (await Idea.generateSummary(form.content)) ||
          "Summary not available.";
      }
      const result = await db?.merge<
        IIdea,
        Partial<IIdeaForm> & { updatedAt: Date }
      >(new StringRecordId(id), {
        ...updater,
        updatedAt: new Date(),
      });
      if (!result) {
        console.error("No idea updated.");
        return undefined;
      }
      return result;
    } catch (err) {
      console.error(err);
      return undefined;
    }
  }

  static async delete(id: string) {
    try {
      const db = await getDatabase();
      const result = await db?.delete<IIdea>(new StringRecordId(id));
      if (!result) {
        console.error("No idea deleted.");
        return undefined;
      }
      return result;
    } catch (err) {
      console.error(err);
      return undefined;
    }
  }

  static async connect(from: string, to: string) {
    try {
      const db = await getDatabase();
      const result = await db?.query<[IIdeaConnection & { id: RecordId }]>(
        `RELATE $fromId -> connected -> $toId SET createdAt = $now;`,
        {
          fromId: new StringRecordId(from),
          toId: new StringRecordId(to),
          now: new Date(),
        },
      );
      if (!result) {
        console.error("No link created.");
        return undefined;
      }
      return result;
    } catch (err) {
      console.error(err);
      return undefined;
    }
  }

  static async disconnect(source: string, target: string) {
    try {
      const db = await getDatabase();
      const result = await db?.query<(IIdeaConnection & { id: RecordId })[]>(
        "DELETE FROM connected WHERE source = $source AND target = $target",
        {
          source,
          target,
        },
      );
      if (!result) {
        console.error("No connection deleted.");
        return undefined;
      }
      return result;
    } catch (err) {
      console.error(err);
      return undefined;
    }
  }

  static async getConnections(id: string) {
    try {
      const db = await getDatabase();
      const incoming = await db?.query<
        [{ incoming_connections: (IIdea & { id: RecordId })[] }[]]
      >(
        `
        SELECT <-connected<-idea AS incoming_connections
        FROM $id
        FETCH incoming_connections;
        `,
        {
          id: new StringRecordId(id),
        },
      );
      if (!incoming) {
        console.error("No connections found.");
        return undefined;
      }
      const outgoing = await db?.query<
        [{ outgoing_connections: (IIdea & { id: RecordId })[] }[]]
      >(
        `
        SELECT ->connected->idea AS outgoing_connections
        FROM $id
        FETCH outgoing_connections;
        `,
        {
          id: new StringRecordId(id),
        },
      );
      if (!outgoing) {
        console.error("No connections found.");
        return undefined;
      }
      const [incomingConnected] = incoming;
      const [outgoingConnected] = outgoing;
      const { incoming_connections } = incomingConnected[0];
      const { outgoing_connections } = outgoingConnected[0];
      return { incoming: incoming_connections, outgoing: outgoing_connections };
    } catch (err) {
      console.error(err);
      return undefined;
    }
  }

  static async getMany(ids: string[]) {
    try {
      const db = await getDatabase();
      const result = await db?.query<(IIdea & { id: RecordId })[]>(
        "SELECT * FROM idea WHERE id IN ($ids)",
        {
          ids,
        },
      );
      if (!result) {
        console.error("No ideas found.");
        return undefined;
      }
      return result;
    } catch (err) {
      console.error(err);
      return undefined;
    }
  }

  static async loadEmbeddings(id: string) {
    try {
      const db = await getDatabase();
      const result = await db?.select<IIdea & { id: RecordId }>(
        new StringRecordId(id),
      );
      if (!result) {
        console.error(`Idea with id ${id} not found.`);
        return;
      }
      const e = new Embeddings();
      const embeddings = await e.generateEmbeddings(result.content);

      const idea = await db?.merge<
        IIdea,
        { embeddings: number[]; embeddingsUpdatedAt: Date }
      >(new StringRecordId(id), {
        embeddings,
        embeddingsUpdatedAt: new Date(),
      });

      if (!idea) {
        console.error(`Idea with id ${id} not found.`);
        return;
      }

      return idea;
    } catch (error) {
      console.error(error);
    }
  }

  static async findSimilar(
    rootNodeId: string,
    options: { limit?: number } = { limit: 10 },
  ) {
    try {
      const db = await getDatabase();
      const rootNode = await Idea.get(rootNodeId);
      if (!rootNode) {
        console.error(`Root node with id ${rootNodeId} not found.`);
        return;
      }
      const limit = options.limit;
      const result = await db?.query<[(IIdeaAsRelation & { id: RecordId })[]]>(
        `
        SELECT
            *,
            vector::distance::euclidean(embeddings, $query_embedding) AS distance
        FROM
            idea
        ORDER BY
            distance ASC
        LIMIT ${limit};
        `,
        {
          query_embedding: rootNode.embeddings,
        },
      );
      if (!result) {
        console.error(`No ideas found.`);
        return;
      }
      const [ideas] = result;
      const filteredIdeas = ideas.filter((idea) => {
        return idea.id.toString() !== rootNodeId;
      });
      return filteredIdeas;
    } catch (err) {
      console.error(err);
      return undefined;
    }
  }

  static async semanticSearch(embedding: number[], limit: number = 10) {
    try {
      const db = await getDatabase();
      const result = await db?.query<[(IIdeaAsRelation & { id: RecordId })[]]>(
        `
        SELECT
            *,
            vector::distance::euclidean(embeddings, $query_embedding) AS distance
        FROM
            idea
        ORDER BY
            distance ASC
        LIMIT ${limit};
        `,
        {
          query_embedding: embedding,
        },
      );
      if (!result) {
        console.error(`No ideas found.`);
        return;
      }
      const [ideas] = result;
      return ideas;
    } catch (err) {
      console.error(err);
      return undefined;
    }
  }

  static async searchIdeas(
    query: string,
    options: { limit?: number } = {},
  ): Promise<SearchResult[] | undefined> {
    const limit = options.limit ?? 10; // Default limit
    const semanticLimitMultiplier = 3; // Fetch more candidates for reranking

    // Define weights for scoring (adjust as needed)
    const weights = {
      semantic: 1.0,
      titleMatch: 0.5, // Higher weight for title matches
      contentMatch: 0.2, // Lower weight for content matches
    };

    try {
      const db = await getDatabase(); // Assuming getDatabase is available
      if (!db) {
        console.error("searchIdeas: Database connection not available.");
        return undefined;
      }

      // 1. Generate embedding for the query
      const embeddingProcessor = new Embeddings();
      const queryEmbedding = await embeddingProcessor.generateEmbeddings(query);

      if (!queryEmbedding) {
        console.error("searchIdeas: Failed to generate query embedding.");
        // Fallback to text-only search? Or return error? Returning undefined for now.
        // TODO: Implement text-only search fallback if needed
        return undefined;
      }

      // 2. Perform initial semantic search to get candidate ideas
      // Fetch more than the final limit to allow for reranking
      const semanticCandidates = await Idea.semanticSearch(
        queryEmbedding,
        limit * semanticLimitMultiplier,
      );

      if (semanticCandidates === undefined) {
        console.error("searchIdeas: Semantic search phase failed.");
        return undefined; // Or empty array?
      }

      if (semanticCandidates.length === 0) {
        // TODO: Optionally perform a pure text search here as a fallback
        return [];
      }

      // 3. Calculate combined scores and rerank
      const resultsWithScores: SearchResult[] = [];
      const queryLower = query.toLowerCase();

      for (const candidate of semanticCandidates) {
        // a. Calculate semantic score (invert distance: lower distance = higher score)
        // Avoid division by zero, ensure score is positive. Adding 1 to distance helps.
        const semanticScore = 1 / (1 + (candidate.distance ?? 1)); // Use ?? 1 as fallback if distance is null/undefined

        // b. Check for text matches (case-insensitive)
        const titleMatchScore = candidate.title
          ?.toLowerCase()
          .includes(queryLower)
          ? weights.titleMatch
          : 0;
        const contentMatchScore = candidate.content
          ?.toLowerCase()
          .includes(queryLower)
          ? weights.contentMatch
          : 0;

        // c. Calculate combined score
        const combinedScore =
          semanticScore * weights.semantic +
          titleMatchScore +
          contentMatchScore;

        // d. Basic highlighting (placeholder - just return first N chars of content)
        // A real implementation would find query terms and add context/markup.
        const highlightText = candidate.content
          ? candidate.content.substring(0, 150) +
            (candidate.content.length > 150 ? "..." : "")
          : "";

        resultsWithScores.push({
          // Need to convert Surreal's RecordId back to string for IIdea type
          // Assuming IIdea expects a string 'id'
          idea: {
            ...candidate,
            id: candidate.id.toString(), // Convert RecordId to string
            // Remove the 'distance' field if it's not part of the standard IIdea type
          } as IIdea, // Asserting type after conversion
          score: combinedScore,
          highlightText: highlightText,
        });
      }

      // 4. Sort by combined score (descending)
      resultsWithScores.sort((a, b) => b.score - a.score);

      // 5. Return the top N results based on the limit
      return resultsWithScores.slice(0, limit);
    } catch (err) {
      console.error(`Error during searchIdeas for query "${query}":`, err);
      return undefined;
    }
  }

  static async generateSummary(content: string) {
    try {
      const lm = getLM();
      const summary = await lm.utils.summarize(content, "sentence");

      return summary;
    } catch (err) {
      console.error(`Error during generateSummary`, err);
      return null;
    }
  }
}
