import { RecordId, StringRecordId } from "surrealdb";
import { getDatabase } from "../../db";
import { Embeddings } from "../../../semantics/embeddings";
import { getLM } from "../../../semantics/lm";
import { IPublicUser, ISafeUser, IUser, User } from "../user";
import { GenerativeSummary, IGenerativeSummary } from "./summaries";
import { IUserFile } from "../userfile";
import { htmlToMarkdown } from "../../../utils/formatting";
import { max_user_notes } from "../../../settings";
import { ITag, ITagIdeaRelationship } from "../tag";
import { logger } from "../../../services/Logger";

export const embeddableContentLimit = 20000;

export type IIdea = {
  id: string | RecordId;
  title: string;
  content: string;
  contentPlain?: string;
  embeddings: number[] | null;
  visibility: IIdeaVisibility;
  createdAt: Date;
  updatedAt: Date;
  contentUpdatedAt: Date;
  contentPlainUpdatedAt: Date;
  embeddingsUpdatedAt: Date;
  connections?: IIdea[];
  relatedIdeas?: IIdeaAsRelation[];
  derived?: IIdeaDerivedMap;
  similar?: IIdeaAsRelation[];
  importedAt?: Date;
};

export type IIdeaVisibility = "private" | "public";

export type IIdeaWithComputedFields = (IIdea | IPublicIdea) & {
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
  tags: ITag[];
  ideaConnections: IIdeaConnection[];
  tagConnections: ITagIdeaRelationship[];
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

export type IUserIdeaStats = {
  total: number;
};

export type IPublicIdea = Omit<IIdea, "embeddings">;

export class Idea {
  constructor() {}

  static attachComputedFields(
    idea: IIdea | IPublicIdea,
  ): IIdeaWithComputedFields {
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
          LET $processedIdeas = SELECT
              *,
              ->is_source_for->(?).* as derivedList
              OMIT embeddings
          FROM idea
          WHERE <-owns<-(user WHERE id = <record> $userId)
          FETCH derivedList, similar, tags;

          LET $ideaIds = $processedIdeas[*].id;
          LET $ideaConnections = SELECT * FROM connected WHERE in IN $ideaIds OR out IN $ideaIds;
          LET $tagConnections = SELECT * FROM describes WHERE out IN $ideaIds;
          LET $tagIds = $tagConnections[*].in;
          LET $tags = SELECT * OMIT embeddings FROM tag WHERE id IN $tagIds;
          LET $files = SELECT VALUE ->owns->user_file FROM ONLY <record> $userId FETCH user_file;

          RETURN {
              files: $files,
              ideaConnections: $ideaConnections,
              tagConnections: $tagConnections,
              ideas: $processedIdeas,
              tags: $tags
          };
        }
      `;
    };

    const userHeavyGraphFunction = () => {
      return `
      DEFINE FUNCTION OVERWRITE fn::user_graph_heavy(
          $userId: string,
          $semanticLimit: option<int>,
          $semanticThreshold: option<float>
      ) {
        LET $got_limit = $semanticLimit ?? 5;
        LET $got_threshold = $threshold ?? 0.4;

        LET $processedIdeas = SELECT
            *,
            ->is_source_for->(?).* as derivedList,
            IF embeddings AND (count(embeddings) > 0 OR type::is::object(embeddings) AND count(object::keys(embeddings)) > 0) THEN
                fn::search_similar_to_embeddings(embeddings, $userId, $got_limit, $got_threshold)
            ELSE
                []
            END AS similar
            OMIT embeddings
        FROM idea
        WHERE <-owns<-(user WHERE id = <record> $userId)
        FETCH derivedList, similar, tags;

        LET $ideaIds = $processedIdeas[*].id;
        LET $ideaConnections = SELECT * FROM connected WHERE in IN $ideaIds OR out IN $ideaIds;
        LET $tagConnections = SELECT * FROM describes WHERE out IN $ideaIds;
        LET $tagIds = $tagConnections[*].in;
        LET $tags = SELECT * OMIT embeddings FROM tag WHERE id IN $tagIds;
        LET $files = SELECT VALUE ->owns->user_file FROM ONLY <record> $userId FETCH user_file;

        RETURN {
            files: $files,
            ideaConnections: $ideaConnections,
            tagConnections: $tagConnections,
            ideas: $processedIdeas,
            tags: $tags
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

    const getUserIdeasPaginated = () => {
      return `
      DEFINE FUNCTION OVERWRITE fn::get_user_ideas_paginated(
        $userId: string,
        $page: int,
        $pageSize: int
      ) {
        LET $userIdeas = SELECT
            *
            FROM idea
            WHERE <-owns<-(user WHERE id = <record> $userId)
            ORDER BY updatedAt DESC, id ASC
            LIMIT $pageSize
            START ($page * $pageSize);
        RETURN $userIdeas;
      };`;
    };

    const getUserIdeaStats = () => {
      return `
      DEFINE FUNCTION OVERWRITE fn::get_user_idea_stats(
        $userId: string
      ) {
        LET $total = count(SELECT VALUE id FROM idea WHERE <-owns<-(user WHERE id = <record> $userId));
        return {
          total: $total
        };
      }
      `;
    };

    const db = await getDatabase();
    await db?.query(userGraphFunction());
    await db?.query(userHeavyGraphFunction());
    await db?.query(getIdeaConnections());
    await db?.query(getIdeaDerived());
    await db?.query(getUserIdeas());
    await db?.query(getUserIdeasPaginated());
    await db?.query(getUserIdeaStats());
  }

  static attachComputedFieldsToCollection(
    ideas: (IIdea | IPublicIdea)[],
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

  static async create(
    form: IIdeaForm,
    userId: string | RecordId,
    options?: {
      omitEmbeddings?: boolean;
      omitDerived?: boolean;
      wasImported?: boolean;
    },
  ) {
    try {
      const db = await getDatabase();
      const user = await User.get(userId, true);
      if (!user) {
        throw new Error(`User with id ${userId} not found.`);
      }
      const stats = await Idea.getUserIdeaStats(user.id.toString());
      if (!stats) {
        throw new Error("Something went wrong getting user stats");
      }
      const { total } = stats;
      if (
        total >= max_user_notes &&
        max_user_notes !== -1 &&
        !User.checkUserHasRole(userId, "superuser")
      ) {
        throw new Error("Tried to add more notes than available.");
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
        contentPlain: htmlToMarkdown(form.content),
        contentPlainUpdatedAt: new Date(),
        embeddings: null,
        visibility: "private",
        contentUpdatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        embeddingsUpdatedAt: new Date(),
        ...(options?.wasImported ? { importedAt: new Date() } : {}),
      });
      if (!result) {
        console.error("No idea created.");
        return undefined;
      }
      const [idea] = result;
      await Idea.connectToUser(idea.id, userId);
      if (!options?.omitEmbeddings) {
        await Idea.loadEmbeddings(idea.id);
      }
      if (!options?.omitDerived) {
        await Idea.runDerivedCascade(idea.id);
      }
      return idea;
    } catch (err) {
      console.error("Error creating idea: ", err);
      logger.error("Error creating idea: ", { error: err });
      return undefined;
    }
  }

  static async createMany(
    forms: IIdeaForm[],
    userId: string | RecordId,
    options?: {
      omitEmbeddings?: boolean;
      omitDerivations?: boolean;
      wereImported?: boolean;
    },
  ) {
    try {
      const db = await getDatabase();
      const user = await User.get(userId, true);
      if (!user) {
        console.error(`User with id ${userId} not found.`);
        return undefined;
      }
      const stats = await Idea.getUserIdeaStats(user.id.toString());
      if (!stats) {
        throw new Error("Something went wrong getting user stats");
      }
      const { total } = stats;
      if (
        total >= max_user_notes &&
        max_user_notes !== -1 &&
        !User.checkUserHasRole(user.id, "superuser")
      ) {
        throw new Error("Tried to add more notes than allowed.");
      }
      if (
        total + forms.length > max_user_notes &&
        max_user_notes !== -1 &&
        !User.checkUserHasRole(user.id, "superuser")
      ) {
        throw new Error(
          "Adding notes would result in larger than allowed note total.",
        );
      }
      const result = await db?.insert<
        IIdea,
        IIdeaForm & {
          createdAt: Date;
          updatedAt: Date;
          contentUpdatedAt: Date;
          embeddingsUpdatedAt: Date;
          contentPlainUpdatedAt: Date;
        }
      >(
        "idea",
        forms.map((form) => {
          return {
            title: form.title,
            content: form.content,
            visibility: form.visibility || "private",
            contentPlain: htmlToMarkdown(form.content),
            contentPlainUpdatedAt: new Date(),
            embeddings: null,
            contentUpdatedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
            embeddingsUpdatedAt: new Date(),
            ...(options?.wereImported ? { importedAt: new Date() } : {}),
          };
        }),
      );
      if (!result) {
        console.error("No idea created.");
        return undefined;
      }
      const ideas = result;
      await Idea.connectManyToUser(
        ideas.map((i) => i.id.toString()),
        userId,
      );
      if (!options?.omitEmbeddings) {
        await Idea.loadManyEmbeddings(ideas.map((i) => i.id.toString()));
      }
      if (!options?.omitDerivations) {
        ideas.forEach((i) => {
          Idea.runDerivedCascade(i.id);
        });
      }
      return ideas;
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

  static async connectManyToUser(
    ideaIds: (string | RecordId)[],
    userId: string | RecordId,
  ) {
    try {
      const db = await getDatabase();
      const result = await db?.query<[IIdeaUserOwnership[]]>(
        `RELATE $fromId -> owns -> $toIds SET createdAt = $now;`,
        {
          fromId: new StringRecordId(userId),
          toIds: ideaIds.map((ideaId) => new StringRecordId(ideaId)),
          now: new Date(),
        },
      );
      if (!result) {
        console.error(`No ownership created for ideas and user "${userId}".`);
        return undefined;
      }
      const [ownership] = result;
      return ownership;
    } catch (err) {
      console.error(`Error during connectToUser for ideas:`, err);
      return undefined;
    }
  }

  static async checkUserOwnership(ideaId: string, userId: string) {
    try {
      const db = await getDatabase();
      const result = await db?.query<[number]>( // Expecting an array with one object: [{ count: number }]
        `count(SELECT id FROM owns WHERE in = $userId AND out = $ideaId);`,
        {
          userId: new StringRecordId(userId),
          ideaId: new StringRecordId(ideaId),
        },
      );

      if (result && result[0] && result[0] > 0) {
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

  static async getUserIdeasPaginated(
    userId: string,
    page?: number,
    pageSize?: number,
  ) {
    try {
      const db = await getDatabase();
      const results = await db?.run<IIdea[]>("fn::get_user_ideas_paginated", [
        userId,
        page,
        pageSize,
      ]);
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

  static async getUserRecentIdeas(userId: string, limit: number) {
    try {
      const db = await getDatabase();
      const results = await db?.query<[IIdea[]]>(
        `
        SELECT * FROM idea
        WHERE
          <-owns<-(user WHERE id = <record> $userId)
        ORDER BY
          updatedAt DESC
        LIMIT <int> $limit;
          `,
        {
          userId,
          limit,
        },
      );
      if (!results) {
        console.error("Something went wrong, no results found.");
        return undefined;
      }
      const [ideas] = results;
      return ideas;
    } catch (err) {
      console.error("Something went wrong", err);
      return undefined;
    }
  }

  static async getUserIdeaStats(
    userId: string,
  ): Promise<IUserIdeaStats | undefined> {
    try {
      const db = await getDatabase();
      const results = await db?.run<IUserIdeaStats>("fn::get_user_idea_stats", [
        String(userId),
      ]);
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

  static async getIdeaOwners(
    ideaId: string,
    safety: "safe",
  ): Promise<ISafeUser | undefined>;
  static async getIdeaOwners(
    ideaId: string,
    safety: "public",
  ): Promise<IPublicUser | undefined>;
  static async getIdeaOwners(
    ideaId: string,
    safety: "none",
  ): Promise<IUser | undefined>;
  static async getIdeaOwners(
    ideaId: string,
    safety: "public" | "safe" | "none" = "safe",
  ) {
    try {
      const db = await getDatabase();
      const results = await db?.query<[IUser & { id: RecordId }[]]>(
        `SELECT VALUE <-owns<-user OMIT password FROM ONLY $ideaId;`,
        {
          ideaId,
        },
      );
      if (!results) {
        console.error("Something went wrong, no results found.");
        return undefined;
      }
      const [users] = results;
      if (safety === "none") {
        return users;
      }
      if (safety === "safe") {
        return User.filterSafeFields(users);
      }
      if (safety === "public") {
        return User.filterPublicFields(users);
      }
      return undefined;
    } catch (err) {
      console.error("Something went wrong", err);
      return undefined;
    }
  }

  static filterPublicFields(idea: IIdea): IPublicIdea;
  static filterPublicFields(idea: IIdea[]): IPublicIdea[];
  static filterPublicFields(
    idea: IIdea | IIdea[],
  ): IPublicIdea | IPublicIdea[] {
    if (Array.isArray(idea)) {
      return idea.map((u) => this.filterPublicFields(u)) as IPublicIdea[];
    }
    const { embeddings, ...safeUser } = idea;
    return safeUser as IPublicIdea;
  }

  static async get(
    id: string | RecordId,
    safety?: "public",
  ): Promise<IPublicIdea>;
  static async get(id: string | RecordId, safety?: "full"): Promise<IIdea>;
  static async get(
    id: string | RecordId,
    safety: "public" | "full" = "public",
  ): Promise<IPublicIdea | IIdea | undefined> {
    try {
      const db = await getDatabase();
      const recordId = typeof id === "string" ? new StringRecordId(id) : id;
      const result = await db?.select<IIdea>(recordId);
      if (!result) {
        console.error(`Idea with id ${id} not found.`);
        return;
      }
      if (safety === "public") {
        return this.filterPublicFields(result);
      }
      if (safety === "full") {
        return result;
      }
      return undefined;
    } catch (err) {
      console.error(err);
      return undefined;
    }
  }
  static async all(safety: "public"): Promise<IPublicIdea[]>;
  static async all(safety: "full"): Promise<IIdea[]>;
  static async all(
    safety: "public" | "full" = "public",
  ): Promise<IPublicIdea[] | IIdea[] | undefined> {
    try {
      const db = await getDatabase();
      const result = await db?.select<IIdea>("idea");
      if (!result) {
        console.error("No ideas found.");
        return undefined;
      }
      if (safety === "public") {
        return this.filterPublicFields(result);
      }
      if (safety === "full") {
        return result;
      }
      return undefined;
    } catch (err) {
      console.error(err);
      return undefined;
    }
  }

  static async graph(
    userId: string,
    options?: { computeFields: boolean },
  ): Promise<IDBGraph | undefined> {
    try {
      const db = await getDatabase();
      const graph = await db?.run<Omit<IDBGraph, "flags">>("fn::user_graph", [
        userId,
      ]);
      if (!graph) {
        console.error("Something went wrong. Graph undefined.");
        return undefined;
      }
      const {
        ideas,
        tags,
        ideaConnections,
        tagConnections,
        files = [],
      } = graph;
      const flags: IDBGraph["flags"] = {
        embeddings: {
          synced: ideas.every((idea) => idea.embeddings),
        },
      };
      const ideasWithDerived = ideas.map((i) => {
        return {
          ...this.filterPublicFields(i),
          derived: Idea.mapDerived(i.derivedList),
        };
      });
      if (options?.computeFields) {
        const computedIdeas =
          Idea.attachComputedFieldsToCollection(ideasWithDerived);
        return {
          ideas: computedIdeas,
          tags,
          ideaConnections,
          tagConnections,
          flags,
          files,
        } as IDBGraphWithComputedFields;
      }
      return {
        ideas: ideasWithDerived,
        tags,
        ideaConnections,
        tagConnections,
        flags,
        files,
      } as IDBGraph;
    } catch (err) {
      console.error(err);
      return undefined;
    }
  }

  static async graphHeavy(
    userId: string,
    options?: { similarityLimit?: number; similarThreshold?: number },
  ): Promise<IDBGraph | undefined> {
    try {
      const db = await getDatabase();
      const graph = await db?.run<Omit<IDBGraph, "flags">>(
        "fn::user_graph_heavy",
        [
          userId,
          options?.similarityLimit || 3,
          options?.similarThreshold || 0.45,
        ],
      );
      if (!graph) {
        console.error("Something went wrong. Graph undefined.");
        return undefined;
      }
      const {
        ideas,
        tags,
        ideaConnections,
        tagConnections,
        files = [],
      } = graph;
      const flags: IDBGraph["flags"] = {
        embeddings: {
          synced: ideas.every((idea) => idea.embeddings),
        },
      };
      const ideasWithDerived = ideas.map((i) => {
        return {
          ...this.filterPublicFields(i),
          derived: Idea.mapDerived(i.derivedList),
        };
      });
      const computedIdeas =
        Idea.attachComputedFieldsToCollection(ideasWithDerived);
      return {
        ideas: computedIdeas,
        tags,
        ideaConnections,
        tagConnections,
        flags,
        files,
      } as IDBGraphWithComputedFields;
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
      if ("content" in form) {
        updater.contentUpdatedAt = new Date();
        updater.contentPlain = form.content ? htmlToMarkdown(form.content) : "";
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

  static async updateMany(
    forms: (Partial<IIdea> & { id: string | RecordId })[],
    withComputations?: boolean,
  ): Promise<(IIdea | undefined)[] | undefined> {
    try {
      const updates: (IIdea | undefined)[] = [];
      for (const form of forms) {
        const { id, ...rest } = form;
        const result = await Idea.update(id, rest);
        updates.push(result);
      }

      if (updates.some((result) => result === undefined)) {
        console.warn(
          "updateMany: One or more ideas failed to update. See previous logs for details for each specific idea.",
        );
      }

      return updates;
    } catch (err) {
      console.error("Error during the updateMany operation:", err);
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
    options: { limit?: number } = { limit: 3 },
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
    options?: {
      limit?: number;
      threshold?: number;
    },
  ) {
    try {
      const db = await getDatabase();
      const ideas = await db?.run<IIdeaAsRelation[]>(
        "fn::search_similar_to_embeddings",
        [embedding, userId, options?.limit || 100, options?.threshold ?? 0.4],
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
        {
          limit: initialFetchLimit,
        },
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

  static getEmbeddableContent(idea: IIdea) {
    const plaintextContent = htmlToMarkdown(idea.content);
    const withTitle = `${idea.title}\n---\n${plaintextContent}`;
    return withTitle;
  }

  static async loadEmbeddings(id: string | RecordId) {
    try {
      const db = await getDatabase();
      const result = await db?.select<IIdea & { id: RecordId }>(
        new StringRecordId(id),
      );
      if (!result) {
        console.error(`Idea with id ${id} not found.`);
        return undefined;
      }
      return await Idea.updateEmbeddings(result);
    } catch (error) {
      console.error(error);
      return undefined;
    }
  }

  static async loadManyEmbeddings(ids: string[] | RecordId[]) {
    try {
      const db = await getDatabase();
      const result = await db?.query<[IIdea[]]>(`SELECT * FROM $ideas;`, {
        ideas: ids.map((i) => new StringRecordId(i)),
      });
      if (!result) {
        throw new Error(`Ideas not found.`);
      }
      const [ideas] = result;
      if (!ideas) {
        throw new Error("Something went wrong getting ideas.");
      }
      return await Idea.updateManyEmbeddings(ideas);
    } catch (error) {
      console.error(error);
    }
  }

  static async updateEmbeddings(idea: IIdea, force = false) {
    try {
      if (
        !force &&
        idea.embeddingsUpdatedAt >= idea.contentUpdatedAt &&
        idea.embeddings?.length !== 0
      ) {
        return false;
      }
      const embedding = new Embeddings();
      const embeddableContent = Idea.getEmbeddableContent(idea);
      if (
        !embeddableContent ||
        embeddableContent.length > embeddableContentLimit
      ) {
        await Idea.update(idea.id, {
          embeddings: [],
          embeddingsUpdatedAt: new Date(),
        });
        return undefined;
      }
      const vector = await embedding.generateEmbeddings(embeddableContent);
      return await Idea.update(idea.id, {
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

  static async updateManyEmbeddings(ideas: IIdea[], force = false) {
    try {
      const e = new Embeddings();
      const ideasAndContent = ideas
        .filter((idea) => {
          if (force) {
            return true;
          }
          if (
            idea.embeddings &&
            idea.embeddingsUpdatedAt! > idea.contentUpdatedAt
          ) {
            return false;
          }
          return true;
        })
        .map((idea) => {
          return [
            idea.id.toString(),
            Idea.getEmbeddableContent(idea).slice(0, embeddableContentLimit),
          ] as [string, string];
        });
      if (!ideasAndContent) {
        return;
      }

      const justContent = ideasAndContent.map((i) => i[1]);
      const embeddings = await e.generateEmbeddingsBatch(justContent);
      const withEmbeddings = ideasAndContent.map(
        (i, index) => [...i, embeddings[index]] as [string, string, number[]],
      );

      const updaters = withEmbeddings.map(([id, content, embeddings]) => {
        return {
          id: id,
          embeddings: embeddings.length > 0 ? embeddings : null,
          embeddingsUpdatedAt: new Date(),
        } as { id: string } & Partial<Idea>;
      });
      const updates = await Idea.updateMany(updaters);
      if (!updates) {
        throw new Error("Error updating many ideas");
      }

      return updates;
    } catch (error) {
      console.error(error);
      return undefined;
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
      const updated = await Idea.updateManyEmbeddings(toUpdate);
      return updated;
    } catch (err) {
      console.error(`Error during synchronizeEmbeddings`, err);
    }
  }

  static async synchronizeContentPlain(ideas: IIdea[], force?: boolean) {
    try {
      const toUpdate = ideas.filter((idea) => {
        if (force) {
          return true;
        }
        if (!idea.contentPlain) {
          return true;
        }
        if (idea.contentPlainUpdatedAt < idea.contentUpdatedAt) {
          return true;
        }
        return false;
      });
      await Idea.updateMany(
        toUpdate.map((update) => {
          return {
            id: update.id,
            contentPlain: htmlToMarkdown(update.content),
            contentPlainUpdatedAt: new Date(),
          };
        }),
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

  static async checkIsPublic(ideaId: string | RecordId) {
    try {
      const idea = await Idea.get(ideaId);
      if (!idea) {
        throw new Error(
          `Idea not found when checking public status: ${ideaId}`,
        );
      }
      const isPublic = idea.visibility === "public";
      return isPublic;
    } catch (error) {
      console.error("Error checking public status: ", error);
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
      this._idea = await Idea.get(ideaId, "full");
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
