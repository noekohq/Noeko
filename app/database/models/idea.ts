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
  flags: {
    embeddings: {
      synced: boolean;
    };
  };
};

export type IDBGraphWithComputedFields = IDBGraph & {
  ideas: IIdeaWithComputedFields[];
};

export type SearchResult = {
  score: number;
  idea: IIdea;
  highlightText: string; // Placeholder for potential future implementation
  debug?: {
    // Optional: Add a debug structure to see score breakdown
    semanticScore: number;
    exactTitleBonus: number;
  };
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

  static async all(filters?: any) {
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
      const flags: IDBGraph["flags"] = {
        embeddings: {
          synced: ideas.every((idea) => idea.embeddings),
        },
      };
      if (options?.computeFields) {
        const computedIdeas = Idea.attachComputedFieldsToCollection(ideas);
        return {
          ideas: computedIdeas,
          edges,
          flags,
        } as IDBGraphWithComputedFields;
      }
      return { ideas, edges, flags } as IDBGraph;
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
            vector::similarity::cosine(embeddings, $query_embedding) AS distance
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
            vector::similarity::cosine(embeddings, $query_embedding) AS distance
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
    options: { limit?: number; semanticThreshold?: number } = {},
  ): Promise<SearchResult[] | undefined> {
    // --- Configuration ---
    const limit = options.limit ?? 10; // Max results to return
    // Default semantic threshold - filter results below this cosine similarity
    const semanticThreshold = options.semanticThreshold ?? 0.5;
    // Fetch more candidates than 'limit' initially to allow for good ranking
    // Adjusted multiplier: fetching 3x allows more room for filtering/reranking
    const semanticLimitMultiplier = 3;
    const initialFetchLimit = Math.max(limit * semanticLimitMultiplier, 20); // Fetch at least 20 potential candidates

    // Weights and Bonuses - Emphasize semantic score, add large bonus for exact title
    const weights = {
      semantic: 1.5, // Primary driver of the score
      // Removed titleMatch and contentMatch weights
    };
    const exactTitleBonus = 2.0; // Large bonus to push exact title matches to the top

    // --- Search Execution ---
    try {
      const db = await getDatabase();
      if (!db) {
        console.error("searchIdeas: Database connection not available.");
        return undefined;
      }

      // 1. Generate embedding for the query
      const embeddingProcessor = new Embeddings();
      const queryEmbedding = await embeddingProcessor.generateEmbeddings(query);

      if (!queryEmbedding) {
        console.error("searchIdeas: Failed to generate query embedding.");
        // TODO: Consider fallback to text-only search if needed
        return undefined;
      }

      // 2. Perform initial semantic search (vector search)
      // Assuming Idea.semanticSearch returns candidates sorted by cosine similarity (higher is better)
      // and the 'distance' field actually contains the cosine similarity score.
      const semanticCandidates = await Idea.semanticSearch(
        queryEmbedding,
        initialFetchLimit, // Fetch more candidates
      );

      if (semanticCandidates === undefined) {
        console.error("searchIdeas: Semantic search phase failed.");
        return undefined;
      }

      if (semanticCandidates.length === 0) {
        // TODO: Optionally perform a pure text search here as a fallback
        return [];
      }

      // 3. Rerank based on Semantic Threshold, Exact Title Match, and Weighted Score
      const resultsWithScores: SearchResult[] = [];
      const queryLower = query.toLowerCase().trim(); // Normalize query for comparison

      for (const candidate of semanticCandidates) {
        // a. Get raw semantic score (cosine similarity)
        // Use 0 as fallback if distance is null/undefined for some reason
        const rawSemanticScore = candidate.distance ?? 0;

        // b. Apply Semantic Threshold Filter
        if (rawSemanticScore < semanticThreshold) {
          // console.log(`Skipping "${candidate.title}" due to low semantic score: ${rawSemanticScore}`);
          continue; // Skip candidates below the relevance threshold
        }

        // c. Check for Exact Title Match Bonus (Case-insensitive, trimmed)
        const currentExactTitleBonus =
          candidate.title?.toLowerCase().trim() === queryLower
            ? exactTitleBonus
            : 0;

        // d. Calculate combined score
        // Primarily driven by weighted semantic score, with a large boost for exact title match.
        const combinedScore =
          rawSemanticScore * weights.semantic + currentExactTitleBonus;

        // e. Basic highlighting (placeholder)
        const highlightText = candidate.content
          ? candidate.content.substring(0, 150) +
            (candidate.content.length > 150 ? "..." : "")
          : "";

        // No combined score threshold here anymore, relying on semantic threshold primarily.
        // We filter based on semantic relevance first.
        resultsWithScores.push({
          idea: {
            ...candidate,
            id: candidate.id.toString(), // Convert RecordId to string if needed
            // Ensure 'distance' field is handled/removed if not part of IIdea
          } as IIdea,
          score: combinedScore,
          highlightText: highlightText,
          debug: {
            // Add debug info
            semanticScore: rawSemanticScore,
            exactTitleBonus: currentExactTitleBonus,
          },
        });
      }

      // 4. Sort by final combined score (descending)
      resultsWithScores.sort((a, b) => b.score - a.score);

      // 5. Return the top N results, up to the limit.
      // Prioritizes relevance - if fewer than 'limit' items pass the semantic threshold, less will be returned.
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

  static async updateEmbeddings(idea: IIdea) {
    try {
      const embedding = new Embeddings();
      const vector = await embedding.generateEmbeddings(idea.content);
      await Idea.update(idea.id, {
        embeddings: vector,
      });
    } catch (err) {
      console.error(
        `Error during updateEmbeddings for idea "${idea.id}":`,
        err,
      );
    }
  }

  static async synchronizeEmbeddings(ideas: IIdea[]) {
    try {
      const toUpdate = ideas.filter((idea) => {
        if (!idea.embeddings) {
          return true;
        }
        if (idea.embeddingsUpdatedAt < idea.contentUpdatedAt) {
          return true;
        }
        return false;
      });
      await Promise.all(toUpdate.map((idea) => Idea.updateEmbeddings(idea)));
    } catch (err) {
      console.error(`Error during synchronizeEmbeddings`, err);
    }
  }
}
