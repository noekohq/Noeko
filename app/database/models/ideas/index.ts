import { RecordId, StringRecordId } from "surrealdb";
import { getDatabase } from "../../db";
import { Embeddings } from "../../../semantics/embeddings";
import { getLM } from "../../../semantics/lm";
import { IUser, User } from "../user";
import { GenerativeSummary, IGenerativeSummary } from "./summaries";
import { IUserFile } from "../userfile";
import { htmlToPlainText } from "../../../utils/formatting";

export type IIdea = {
  id: string | RecordId;
  title: string;
  content: string;
  contentPlain?: string;
  embeddings: number[] | null;
  createdAt: Date;
  updatedAt: Date;
  contentUpdatedAt: Date;
  contentPlainUpdatedAt: Date;
  embeddingsUpdatedAt: Date;
  connections?: IIdea[];
  relatedIdeas?: IIdeaAsRelation[];
  derived?: IIdeaDerivedMap;
  similar?: IIdeaAsRelation[];
};

export type IIdeaWithComputedFields = IIdea & {
  embeddingsOutOfDate: boolean;
};

export type IIdeaAsRelation = IIdea & {
  distance: number;
  derivedList: IIdeaDerived[];
};

export type IIdeaForm = Omit<
  IIdea,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "contentUpdatedAt"
  | "contentPlainUpdatedAt"
  | "embeddingsUpdatedAt"
>;

export type IIdeaConnection = {
  id: string;
  in: string;
  out: string;
};

export type IDerivedType = "generative_summary";
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
  ideas: (IIdea & { derivedList: IIdeaDerived[] })[];
  edges: IIdeaConnection[];
  files: IUserFile[];
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
  idea: IIdeaAsRelation;
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
          $semanticLimit: option<int>
      ) {
          LET $similarityLimit = $semanticLimit ?? 5;

          LET $userOwnedIdeas = SELECT VALUE ->owns->idea FROM ONLY <record> $userId FETCH idea;
          LET $ideas = IF $userOwnedIdeas IS NONE THEN [] ELSE $userOwnedIdeas END;

          -- 2. Extract the IDs
          LET $ideaIds = $ideas[*].id;

          -- 3. Get connections
          LET $connections = IF array::len($ideaIds) > 0 THEN (
              SELECT * FROM connected WHERE in IN $ideaIds OR out IN $ideaIds
          ) ELSE
              []
          END;

          -- 4. Get user files
          LET $userFiles = SELECT VALUE ->owns->user_file FROM ONLY <record> $userId FETCH user_file;
          LET $files = IF $userFiles IS NONE THEN [] ELSE $userFiles END;

          -- 5. Select final idea data, including derived and similar ideas
          LET $processedIdeas = SELECT
              *,
              ->is_source_for->(?).* as derivedList,
              -- Call the similarity function with the determined limit
              fn::search_similar_to_embeddings(embeddings, $userId, $similarityLimit) as similar
          FROM $ideas
          FETCH derivedList, similar;

          RETURN {
              ideas: $processedIdeas,
              connections: $connections,
              files: $files,
          };
      }
      `;
    };

    const getIdeaConnections = () => {
      return `
      DEFINE FUNCTION OVERWRITE fn::get_idea_connections(
        $ideaId: string,
      ) {
        LET $connections = SELECT
            *,
            ->is_source_for->(?).* as derivedList
        FROM
            (SELECT VALUE array::complement(<->connected<->idea.id, [id]) FROM ONLY <record> $ideaId);

        RETURN $connections;
      }
      `;
    };

    const getIdeaDerived = () => {
      return `
      DEFINE FUNCTION OVERWRITE fn::get_idea_derived(
        $ideaId: string,
      ) {
        LET $derived = SELECT VALUE ->is_source_for->(?) as derived FROM ONLY <record> $ideaId FETCH derived;

        RETURN $derived;
      }
      `;
    };

    const getUserIdeas = () => {
      return `
      DEFINE FUNCTION OVERWRITE fn::get_user_ideas(
        $userId: string
      ) {
        LET $userIdeas = SELECT VALUE ->owns->idea as userIdeas FROM ONLY <record> $userId FETCH userIdeas;
        return $userIdeas;
      }
      `;
    };

    const db = await getDatabase();
    await db?.query(userGraphFunction());
    await db?.query(getIdeaConnections());
    await db?.query(getIdeaDerived());
    await db?.query(getUserIdeas());
  }

  static attachComputedFieldsToCollection(
    ideas: IIdea[],
  ): IIdeaWithComputedFields[] {
    return ideas.map(Idea.attachComputedFields);
  }

  static async runDerivedCascade(ideaId: string | RecordId) {
    try {
      const derivedCascade = new IdeaDerivedCascade(ideaId);
      return await derivedCascade.cascade();
    } catch (err) {
      console.error("Error running derived cascade: ", err);
      return undefined;
    }
  }

  static async runDeleteCascade(ideaId: string | RecordId) {
    try {
      const deleteCascade = new IdeaDerivedCascade(ideaId);
      return await deleteCascade.deleteCascade();
    } catch (err) {
      console.error("Error running delete cascade: ", err);
      return undefined;
    }
  }

  static async create(form: IIdeaForm, userId: string | RecordId) {
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
          contentUpdatedAt: Date;
          embeddingsUpdatedAt: Date;
          contentPlainUpdatedAt: Date;
        }
      >("idea", {
        title: form.title,
        content: form.content,
        contentPlain: htmlToPlainText(form.content),
        contentPlainUpdatedAt: new Date(),
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
      return idea;
    } catch (err) {
      console.error(err);
      return undefined;
    }
  }

  static async connectToUser(
    ideaId: string | RecordId,
    userId: string | RecordId,
  ) {
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

  static async getUserIdeas(userId: string) {
    try {
      const db = await getDatabase();
      const results = await db?.run<IIdea[]>("fn::get_user_ideas", [userId]);
      if (!results) {
        console.error("Something went wrong, no results found.");
        return undefined;
      }
      return results;
    } catch (err) {
      console.error("Something went wrong", err);
      return undefined;
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
  ): Promise<IDBGraph | undefined> {
    try {
      const db = await getDatabase();
      const graph = await db?.run<{
        ideas: (IIdea & { derivedList: IIdeaDerived[] })[];
        connections: IIdeaConnection[];
        files: IUserFile[];
      }>("fn::user_graph", [userId]);
      if (!graph) {
        console.error("Something went wrong. Graph undefined.");
        return undefined;
      }
      const { ideas, connections, files = [] } = graph;
      const flags: IDBGraph["flags"] = {
        embeddings: {
          synced: ideas.every((idea) => idea.embeddings),
        },
      };
      const ideasWithDerived = ideas.map((i) => {
        return {
          ...i,
          derived: Idea.mapDerived(i.derivedList),
        };
      });
      if (options?.computeFields) {
        const computedIdeas =
          Idea.attachComputedFieldsToCollection(ideasWithDerived);
        return {
          ideas: computedIdeas,
          edges: connections,
          flags,
          files,
        } as IDBGraphWithComputedFields;
      }
      return {
        ideas: ideasWithDerived,
        edges: connections,
        flags,
        files,
      } as IDBGraph;
    } catch (err) {
      console.error(err);
      return undefined;
    }
  }

  static async update(
    id: string | RecordId,
    form: Partial<IIdea>,
    withComputations?: boolean,
  ) {
    try {
      const db = await getDatabase();
      const originalIdea = await Idea.get(id);
      if (!originalIdea) {
        throw new Error("Idea does not exist with id: " + id.toString());
      }
      const updater: Partial<IIdea> = form;
      if (form.content !== undefined) {
        updater.contentUpdatedAt = new Date();
        updater.contentPlain = htmlToPlainText(form.content);
        updater.contentPlainUpdatedAt = new Date();
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
      if (withComputations && updater.content !== originalIdea.content) {
        await Idea.updateEmbeddings(result);
        await Idea.runDerivedCascade(result.id);
      }
      return result;
    } catch (err) {
      console.error(err);
      return undefined;
    }
  }

  static async synchronizeUpdate(idea: IIdea) {
    try {
      await Idea.updateEmbeddings(idea);
      await Idea.runDerivedCascade(idea.id);
    } catch (error) {
      console.error(error);
      return undefined;
    }
  }

  static async delete(id: string | RecordId) {
    try {
      const db = await getDatabase();
      await Idea.runDeleteCascade(id);
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

  static async deleteUserIdeas(userId: string | RecordId) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw Error("Database not initialized.");
      }
      const userIdeas = await db.run<IIdea[]>("fn::get_user_ideas", [userId]);
      if (!userIdeas) {
        throw Error("Error getting user ideas");
      }
      for (const idea of userIdeas) {
        const deleted = await Idea.delete(idea.id.toString());
        if (!deleted) {
          throw Error(`Idea ${idea.id} failed to delete.`);
        }
      }
      return true;
    } catch (error) {
      console.error(error);
      return undefined;
    }
  }

  static async checkConnectionExists(source: string, target: string) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Could not get database!");
      }
      const results = await db.query<[IIdeaConnection[]]>(
        `SELECT * FROM connected WHERE in = $source AND out = $target;`,
        {
          source,
          target,
        },
      );
      if (!results) {
        throw new Error("Could not get results!");
      }
      const [connections] = results;
      if (connections.length > 0) {
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error checking connection exists: ", error);
      return undefined;
    }
  }

  static async connect(source: string, target: string) {
    try {
      const connectionExists = await Idea.checkConnectionExists(source, target);
      if (connectionExists === undefined) {
        throw new Error("Could not check if connection existed");
      }
      if (connectionExists) {
        console.error(
          "Did not create duplicate connection between: ",
          source,
          target,
        );
        return undefined;
      }
      console.log("Checked connection exists: ", connectionExists);
      const db = await getDatabase();
      const result = await db?.query<[IIdeaConnection & { id: RecordId }]>(
        `RELATE $fromId -> connected -> $toId CONTENT { createdAt: $now, }`,
        {
          fromId: new StringRecordId(source),
          toId: new StringRecordId(target),
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
      console.log("Deleting from connection: ", source, target);
      const result = await db?.query<IIdeaConnection[]>(
        "DELETE FROM (SELECT VALUE <->connected FROM ONLY <record> $source) WHERE out = <record> $target OR in = <record> $target;",
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
      const results = await db?.run<
        (IIdea & { id: RecordId; derivedList: IIdeaDerived[] })[]
      >("fn::get_idea_connections", [id]);
      if (!results) {
        console.error("No connections found.");
        return undefined;
      }
      const connections = results.map((connection) => {
        return {
          ...connection,
          derived: Idea.mapDerived(connection.derivedList),
        };
      });
      return connections;
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

  static mapDerived(derived: IIdeaDerived[]) {
    const map: IIdeaDerivedMap = {};
    derived.forEach((d) => {
      const type = d.id.tb as keyof IIdeaDerivedMap;
      map[type] = d;
    });
    return map;
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

  static async findSimilar(
    userId: string | RecordId,
    rootNodeId: string | RecordId,
    options: { limit?: number } = { limit: 10 },
  ) {
    try {
      const db = await getDatabase();
      const limit = options.limit;
      const ideas = await db?.run<IIdeaAsRelation[]>(
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
      const withLimit = filteredIdeas.filter((idea) => {
        return idea.distance > 0.5;
      });
      const withDerivedMapped = withLimit.map((idea) => {
        return {
          ...idea,
          derived: Idea.mapDerived(idea.derivedList),
        };
      });
      return withDerivedMapped;
    } catch (err) {
      console.error(err);
      return undefined;
    }
  }

  static async semanticSearch(
    userId: string | RecordId,
    embedding: number[],
    limit: number = 10,
  ) {
    try {
      const db = await getDatabase();
      const ideas = await db?.run<IIdeaAsRelation[]>(
        "fn::search_similar_to_embeddings",
        [embedding, userId, limit],
      );
      if (!ideas) {
        console.error(`No ideas found.`);
        return;
      }
      const withDerivedMapped = ideas.map((idea) => {
        return {
          ...idea,
          derived: Idea.mapDerived(idea.derivedList),
        };
      });
      return withDerivedMapped;
    } catch (err) {
      console.error(err);
      return undefined;
    }
  }

  static async searchIdeas(
    userId: string | RecordId,
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
          },
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

  static getEmbeddableContent(content: string) {
    const plaintextContent = htmlToPlainText(content);
    return plaintextContent;
  }

  static async loadEmbeddings(id: string | RecordId) {
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
      const embeddableContent = htmlToPlainText(result.content);
      if (!embeddableContent) {
        await Idea.update(result.id, {
          embeddings: [],
          embeddingsUpdatedAt: new Date(),
        });
        return;
      }

      const embeddings = await e.generateEmbeddings(embeddableContent);

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

  static async updateEmbeddings(idea: IIdea, force = false) {
    try {
      if (!force && idea.embeddingsUpdatedAt >= idea.contentUpdatedAt) {
        return;
      }
      const embedding = new Embeddings();
      const embeddableContent = htmlToPlainText(idea.content);
      if (!embeddableContent) {
        await Idea.update(idea.id, {
          embeddings: [],
          embeddingsUpdatedAt: new Date(),
        });
        return;
      }
      const vector = await embedding.generateEmbeddings(embeddableContent);
      await Idea.update(idea.id, {
        embeddings: vector,
        embeddingsUpdatedAt: new Date(),
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

  static async synchronizeContentPlain(ideas: IIdea[]) {
    try {
      const toUpdate = ideas.filter((idea) => {
        if (!idea.contentPlain) {
          return true;
        }
        if (idea.contentPlainUpdatedAt < idea.contentUpdatedAt) {
          return true;
        }
        return false;
      });
      console.log("To update: ", toUpdate);
      await Promise.all(
        toUpdate.map((idea) =>
          Idea.update(idea.id, {
            contentPlain: htmlToPlainText(idea.content),
            contentPlainUpdatedAt: idea.contentUpdatedAt,
          }),
        ),
      );
    } catch (err) {
      console.error(`Error during synchronizeContentPlain`, err);
    }
  }

  static async derive(ideaId: string | RecordId, type: IDerivedType) {
    try {
      if (type === "generative_summary") {
        return GenerativeSummary.create(ideaId);
      }
      throw Error(`Type ${type} cannot be derived.`);
    } catch (error) {
      console.error("Error deriving: ", type, error);
      return false;
    }
  }

  static async removeDerived(ideaId: string | RecordId, type: IDerivedType) {
    try {
      if (type === "generative_summary") {
        return await GenerativeSummary.deleteCascade(ideaId);
      }
      throw Error(`Type ${type} cannot be derived.`);
    } catch (error) {
      console.error("Error deleting derived: ", type, error);
      return false;
    }
  }
}

class IdeaDerivedCascade {
  private _ideaId: string | RecordId;
  private _idea: IIdea | undefined;

  constructor(ideaId: string | RecordId) {
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

  async deleteCascade() {
    try {
      await GenerativeSummary.deleteCascade(this.ideaId);
    } catch (error) {
      console.error(`Error during cascade for idea "${this.ideaId}":`, error);
    }
  }
}
