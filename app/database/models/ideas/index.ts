import { RecordId, RecordIdValue, StringRecordId } from "surrealdb";
import { getDatabase } from "../../db";
import { Embeddings } from "../../../semantics/embeddings";
import { getLM } from "../../../semantics/lm";
import { IUser, User } from "../user";
import { GenerativeSummary, IGenerativeSummary } from "./summaries";

export type IIdea = {
  id: string;
  title: string;
  content: string;
  embeddings: number[] | null;
  createdAt: Date;
  updatedAt: Date;
  contentUpdatedAt: Date;
  embeddingsUpdatedAt: Date;
  connections?: IIdeaConnection[];
  relatedIdeas?: IIdeaAsRelation[];
  derived?: IIdeaDerivedMap;
};

export type IIdeaWithComputedFields = IIdea & {
  embeddingsOutOfDate: boolean;
};

export type IIdeaAsRelation = IIdea & {
  distance: number;
};

export type IIdeaWithRecordId = IIdea & {
  id: RecordId;
};

export type IIdeaForm = Omit<IIdea, "id">;

export type IIdeaConnection = {
  id: string;
  in: string;
  out: string;
};

export type IIdeaDerived = IGenerativeSummary;

export type IIdeaDerivedMap = {
  generative_summary?: IGenerativeSummary;
};

export type IIdeaUserOwnership = {
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

  static async up() {
    const userGraphFunction = () => {
      return `
      DEFINE FUNCTION OVERWRITE fn::user_graph(
        $userId: string,
      ) {
        LET $userIdeas = SELECT ->owns->idea as userIdeas FROM ONLY <record> $userId FETCH userIdeas;
        LET $ideaIds = array::flatten($userIdeas[*].id);
        LET $connections = SELECT * FROM connected WHERE in IN $ideaIds OR out IN $ideaIds;
        LET $ideas = $userIdeas.userIdeas;

        RETURN {
            ideas: $ideas,
            connections: $connections,
        };
      }
      `;
    };

    const searchSimilarToIdea = () => {
      return `
      DEFINE FUNCTION OVERWRITE fn::search_similar_to_idea(
        $ideaId: string,
        $userId: string,
        $limit: int
      ) {
        LET $embeddings = SELECT embeddings FROM ONLY <record> $ideaId;
        LET $userIdeas = SELECT VALUE ->owns->idea.id FROM ONLY <record> $userId;

        LET $results =
            SELECT
                *,
                vector::similarity::cosine(embeddings, $embeddings.embeddings) AS distance
            FROM idea
            WHERE id IN $userIdeas
            ORDER BY distance ASC
            LIMIT $limit;

        RETURN $results;
      }
      `;
    };

    const searchSimilarToEmbeddings = () => {
      return `
      DEFINE FUNCTION OVERWRITE fn::search_similar_to_embeddings(
        $provided_embeddings: array<float>,
        $userId: string,
        $limit: int
      ) {
        LET $userIdeas = SELECT VALUE ->owns->idea.id FROM ONLY <record> $userId;

        LET $results =
            SELECT
                *,
                vector::similarity::cosine(embeddings, $provided_embeddings) AS distance
            FROM idea
            WHERE id IN $userIdeas
            ORDER BY distance ASC
            LIMIT $limit;

        RETURN $results;
      }
      `;
    };

    const getIdeaConnections = () => {
      return `
      DEFINE FUNCTION OVERWRITE fn::get_idea_connections(
        $ideaId: string,
      ) {
        LET $incoming = SELECT VALUE <-connected<-idea FROM ONLY <record> $ideaId FETCH idea;
        LET $outgoing = SELECT VALUE ->connected->idea FROM ONLY <record> $ideaId FETCH idea;

        RETURN {
            incoming: $incoming,
            outgoing: $outgoing,
        };
      }
      `;
    };

    const getIdeaDerived = () => {
      return `
      DEFINE FUNCTION OVERWRITE fn::get_idea_derived(
        $ideaId: string,
      ) {
        LET $derived = SELECT VALUE ->is_source_for->generative_summary as derived FROM ONLY <record> $ideaId FETCH derived;

        RETURN $derived;
      }
      `;
    };

    const db = await getDatabase();
    await db?.query(userGraphFunction());
    await db?.query(searchSimilarToIdea());
    await db?.query(searchSimilarToEmbeddings());
    await db?.query(getIdeaConnections());
    await db?.query(getIdeaDerived());
  }

  static attachComputedFieldsToCollection(
    ideas: IIdea[],
  ): IIdeaWithComputedFields[] {
    return ideas.map(Idea.attachComputedFields);
  }

  static async runDerivedCascade(ideaId: string) {
    try {
      const derivedCascade = new IdeaDerivedCascade(ideaId);
      return await derivedCascade.cascade();
    } catch (err) {
      console.error("Error running derived cascade: ", err);
      return undefined;
    }
  }

  static async create(form: IIdeaForm, userId: string) {
    try {
      const db = await getDatabase();
      const user = await User.get(userId, true);
      if (!user) {
        console.error(`User with id ${userId} not found.`);
        return undefined;
      }
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
      await Idea.connectToUser(idea.id, userId);
      await Idea.loadEmbeddings(idea.id);
      await Idea.runDerivedCascade(idea.id);
      return result;
    } catch (err) {
      console.error(err);
      return undefined;
    }
  }

  static async connectToUser(ideaId: string, userId: string) {
    try {
      const db = await getDatabase();
      const result = await db?.query<[IIdeaUserOwnership & { id: RecordId }]>(
        `RELATE $fromId -> owns -> $toId SET createdAt = $now;`,
        {
          fromId: new StringRecordId(userId),
          toId: new StringRecordId(ideaId),
          now: new Date(),
        },
      );
      if (!result) {
        console.error(
          `No ownership created for idea "${ideaId}" and user "${userId}".`,
        );
        return undefined;
      }
      const [ownership] = result;
      return ownership;
    } catch (err) {
      console.error(`Error during connectToUser for idea "${ideaId}":`, err);
      return undefined;
    }
  }

  static async checkUserOwnership(ideaId: string, userId: string) {
    try {
      const db = await getDatabase();
      const results = await db?.query<[IIdeaUserOwnership & { id: RecordId }]>(
        `SELECT * FROM owns WHERE in = $userId AND out = $ideaId;`,
        {
          userId,
          ideaId,
        },
      );

      if (!results) {
        console.error(
          `No ownership found for idea "${ideaId}" and user "${userId}".`,
        );
        return false;
      }
      const [ownership] = results;
      if (ownership) {
        return true;
      }
      return false;
    } catch (err) {
      console.error(
        `Error during checkUserOwnership for idea "${ideaId}":`,
        err,
      );
      return false;
    }
  }

  static async getIdeaOwners(ideaId: string) {
    try {
      const db = await getDatabase();
      const results = await db?.query<[IUser & { id: RecordId }[]]>(
        `SELECT VALUE <-owns<-user FROM ONLY $ideaId;`,
        {
          ideaId,
        },
      );
      if (!results) {
        console.error("Something went wrong, no results found.");
        return undefined;
      }
      const [users] = results;
      return users;
    } catch (err) {
      console.error("Something went wrong", err);
      return undefined;
    }
  }

  static async get(id: string | RecordId) {
    try {
      const db = await getDatabase();
      const recordId = typeof id === "string" ? new StringRecordId(id) : id;
      const result = await db?.select<IIdea>(recordId);
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
    userId: string,
    filters?:
      | {
          highlightedNode?: string;
        }
      | "none",
    options?: { computeFields: boolean },
  ) {
    try {
      const db = await getDatabase();
      const graph = await db?.run<{
        ideas: IIdea[];
        connections: IIdeaConnection[];
      }>("fn::user_graph", [userId]);
      if (!graph) {
        console.error("Something went wrong. Graph undefined.");
        return undefined;
      }
      const { ideas, connections } = graph;
      const flags: IDBGraph["flags"] = {
        embeddings: {
          synced: ideas.every((idea) => idea.embeddings),
        },
      };
      if (options?.computeFields) {
        const computedIdeas = Idea.attachComputedFieldsToCollection(ideas);
        return {
          ideas: computedIdeas,
          edges: connections,
          flags,
        } as IDBGraphWithComputedFields;
      }
      return { ideas, edges: connections, flags } as IDBGraph;
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
      await Idea.runDerivedCascade(result.id);
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
        `RELATE $fromId -> connected -> $toId CONTENT { createdAt: $now; }`,
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
        "DELETE FROM connected WHERE source = $source AND target = $target;",
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
      const results = await db?.run<{
        incoming: (IIdea & { id: RecordId })[];
        outgoing: (IIdea & { id: RecordId })[];
      }>("fn::get_idea_connections", [id]);
      if (!results) {
        console.error("No connections found.");
        return undefined;
      }
      const { incoming, outgoing } = results;
      return { incoming, outgoing };
    } catch (err) {
      console.error(err);
      return undefined;
    }
  }

  static async getDerived(id: string) {
    try {
      const db = await getDatabase();
      const derived = await db?.run<IIdeaDerived[]>("fn::get_idea_derived", [
        id,
      ]);
      if (!derived) {
        console.error("No derived ideas found.");
        return undefined;
      }
      return derived;
    } catch (err) {
      console.error(err);
      return undefined;
    }
  }

  static async getDerivedMap(id: string) {
    try {
      const db = await getDatabase();
      const derived = await db?.run<IIdeaDerived[]>("fn::get_idea_derived", [
        id,
      ]);
      if (!derived) {
        console.error("No derived ideas found.");
        return undefined;
      }
      const map: IIdeaDerivedMap = {};
      derived.forEach((d) => {
        const type = d.id.tb as keyof IIdeaDerivedMap;
        map[type] = d;
      });
      return map;
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
    userId: string,
    rootNodeId: string,
    options: { limit?: number } = { limit: 10 },
  ) {
    try {
      const db = await getDatabase();
      const limit = options.limit;
      const ideas = await db?.run<(IIdeaAsRelation & { id: RecordId })[]>(
        "fn::search_similar_to_idea",
        [rootNodeId, userId, limit],
      );
      if (!ideas) {
        console.error(`No ideas found.`);
        return;
      }
      const filteredIdeas = ideas.filter((idea) => {
        return idea.id.toString() !== rootNodeId;
      });
      return filteredIdeas;
    } catch (err) {
      console.error(err);
      return undefined;
    }
  }

  static async semanticSearch(
    userId: string,
    embedding: number[],
    limit: number = 10,
  ) {
    try {
      const db = await getDatabase();
      const ideas = await db?.run<(IIdeaAsRelation & { id: RecordId })[]>(
        "fn::search_similar_to_embeddings",
        [embedding, userId, limit],
      );
      if (!ideas) {
        console.error(`No ideas found.`);
        return;
      }
      return ideas;
    } catch (err) {
      console.error(err);
      return undefined;
    }
  }

  static async searchIdeas(
    userId: string,
    query: string,
    options: { limit?: number; semanticThreshold?: number } = {},
  ): Promise<SearchResult[] | undefined> {
    const limit = options.limit ?? 10;
    const semanticThreshold = options.semanticThreshold ?? 0.5;
    const semanticLimitMultiplier = 3;
    const initialFetchLimit = Math.max(limit * semanticLimitMultiplier, 20);

    const weights = {
      semantic: 1.5,
    };
    const exactTitleBonus = 2.0;

    try {
      const db = await getDatabase();
      if (!db) {
        console.error("Database connection not available.");
        return undefined;
      }

      const embeddingProcessor = new Embeddings();
      const queryEmbedding = await embeddingProcessor.generateEmbeddings(query);

      if (!queryEmbedding) {
        console.error("searchIdeas: Failed to generate query embedding.");
        // TODO: Consider fallback to text-only search if needed
        return undefined;
      }

      const semanticCandidates = await Idea.semanticSearch(
        userId,
        queryEmbedding,
        initialFetchLimit,
      );

      if (semanticCandidates === undefined) {
        console.error("searchIdeas: Semantic search phase failed.");
        return undefined;
      }

      if (semanticCandidates.length === 0) {
        // TODO: Optionally perform a pure text search here as a fallback
        return [];
      }

      const resultsWithScores: SearchResult[] = [];
      const queryLower = query.toLowerCase().trim();

      for (const candidate of semanticCandidates) {
        const rawSemanticScore = candidate.distance ?? 0;

        if (rawSemanticScore < semanticThreshold) {
          continue;
        }

        const currentExactTitleBonus =
          candidate.title?.toLowerCase().trim() === queryLower
            ? exactTitleBonus
            : 0;

        const combinedScore =
          rawSemanticScore * weights.semantic + currentExactTitleBonus;

        const highlightText = candidate.content
          ? candidate.content.substring(0, 150) +
            (candidate.content.length > 150 ? "..." : "")
          : "";

        resultsWithScores.push({
          idea: {
            ...candidate,
            id: candidate.id.toString(),
          } as IIdea,
          score: combinedScore,
          highlightText: highlightText,
          debug: {
            semanticScore: rawSemanticScore,
            exactTitleBonus: currentExactTitleBonus,
          },
        });
      }

      resultsWithScores.sort((a, b) => b.score - a.score);

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

class IdeaDerivedCascade {
  private _ideaId: string;
  private _idea: IIdea | undefined;

  constructor(ideaId: string) {
    this._ideaId = ideaId;
    (async () => {
      this._idea = await Idea.get(ideaId);
      if (!this._idea) {
        throw new Error(
          `Idea not found when constructing DerivedCascade: ${ideaId}`,
        );
      }
    })();
  }

  get ideaId() {
    return this._ideaId;
  }

  async cascade() {
    try {
      const updatedGenerativeSummary =
        await GenerativeSummary.cascadeGenerativeSummary(this.ideaId);
      if (updatedGenerativeSummary) {
        console.info(`Updated generative summary for idea "${this.ideaId}"`);
      } else {
        console.error(
          `No generative summary updated for idea "${this.ideaId}"`,
        );
      }
    } catch (error) {
      console.error(`Error during cascade for idea "${this.ideaId}":`, error);
    }
  }
}
