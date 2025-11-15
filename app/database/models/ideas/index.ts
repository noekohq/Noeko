import { RecordId, StringRecordId } from "surrealdb";
import { getDatabase } from "../../db";
import { getEmbedder } from "../../../ai/embeddings/embeddings";
import { getLM } from "../../../ai/lms/lm";
import { IPublicUser, ISafeUser, IUser, User } from "../user";
import { GenerativeSummary, IGenerativeSummary } from "./summaries";
import { IUserFile } from "../userfile";
import { htmlToMarkdown } from "../../../utils/formatting";
import { max_embeddable_characters, max_user_notes } from "../../../settings";
import { ITag, ITagDescriptionRelationship } from "../tag";
import { logger } from "../../../services/Logger";
import { Search } from "../../../services/Search";

export const embeddableContentLimit = max_embeddable_characters;

export type IIdea = {
  id: string | RecordId;
  title: string;
  content: string;
  contentPlain?: string;
  yState?: string;
  embeddings: number[] | null;
  visibility: IIdeaVisibility;
  createdAt: Date;
  updatedAt: Date;
  viewedAt: Date;
  contentUpdatedAt: Date;
  contentPlainUpdatedAt: Date;
  embeddingsUpdatedAt: Date;
  titleGeneratedAt?: Date;
  connections?: IIdea[];
  relatedIdeas?: IIdeaAsRelation[];
  derived?: IIdeaDerivedMap;
  similar?: IIdeaAsRelation[];
  importedAt?: Date;
};

export type IIdeaVisibility = "private" | "public";

export type IIdeaWithComputedFields = (IIdea | ISafeIdea) & {
  embeddingsOutOfDate: boolean;
};

export type IIdeaAsRelation = ISafeIdea & {
  distance: number;
  derivedList: IIdeaDerived[];
};

export type IIdeaForm = Omit<
  IIdea,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "viewedAt"
  | "contentUpdatedAt"
  | "contentPlainUpdatedAt"
  | "embeddingsUpdatedAt"
>;

export type IIdeaConnection = {
  id: string;
  in: string;
  out: string;
};

export type IIdeaShareAccess = "editor" | "viewonly";

export type IIdeaShare = {
  id: string;
  in: string;
  out: string;
  accessLevel: IIdeaShareAccess;
};

export type IIdeaShareDetails = {
  user: IPublicUser;
  accessLevel: IIdeaShareAccess;
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
  tagConnections: ITagDescriptionRelationship[];
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

export type IUserIdeaStats = {
  total: number;
};

export type ISafeIdea = Omit<IIdea, "embeddings">;

export type IViewOnlyIdea = Pick<
  ISafeIdea,
  "id" | "title" | "content" | "createdAt" | "updatedAt"
>;

export type IIdeaSortFields = "createdAt" | "updatedAt" | "viewedAt";
export type IIdeaQuery = Partial<{
  sort?: {
    field: IIdeaSortFields;
    direction: "desc" | "asc";
  };
  limit?: number;
  start?: number;
}>;

export class IdeaQueryBuilder {
  private whereClauses: string[] = [];
  private params: Record<string, any> = {};
  private sortClause: string = "";
  private paginationClause: string = "";

  constructor() {}

  public ownedBy(userId: string | RecordId): this {
    this.whereClauses.push(`<-owns<-(user WHERE id = $userId)`);
    this.params.userId = new StringRecordId(userId);
    return this;
  }

  public sortBy(
    field: IIdeaSortFields,
    direction: "desc" | "asc" = "desc",
  ): this {
    this.sortClause = `ORDER BY ${field} ${direction}`;
    return this;
  }

  public paginate(options: { start?: number; limit?: number }): this {
    if (options.limit) {
      this.paginationClause += ` LIMIT ${options.limit}`;
    }
    if (options.start) {
      this.paginationClause += ` START ${options.start}`;
    }
    return this;
  }

  public build(): {
    query: string;
    params: Record<string, any>;
  } {
    const where =
      this.whereClauses.length > 0
        ? `WHERE ${this.whereClauses.join(" AND ")}`
        : "";

    const query = `
      SELECT
        *
      OMIT embeddings
      FROM idea
      ${where}
      ${this.sortClause}
      ${this.paginationClause}
    `;

    return {
      query,
      params: this.params,
    };
  }
}

export class Idea {
  constructor() {}

  static attachComputedFields(
    idea: IIdea | ISafeIdea,
  ): IIdeaWithComputedFields {
    return {
      ...idea,
      embeddingsOutOfDate:
        new Date(idea.contentUpdatedAt) < new Date(idea.embeddingsUpdatedAt),
    };
  }

  static async up() {
    const db = await getDatabase();
    if (!db) {
      throw new Error("Couldn't get database");
    }

    // await db?.query(
    //   `DEFINE INDEX OVERWRITE idx_idea_timestamps ON TABLE idea COLUMNS createdAt, updatedAt, viewedAt;`,
    // );

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
          $userId: string
      ) {
        LET $processedIdeas = SELECT
            *,
            ->is_source_for->(?).* as derivedList,
            IF embeddings AND (count(embeddings) > 0 OR type::is::object(embeddings) AND count(object::keys(embeddings)) > 0) THEN
            (
              SELECT
                  *,
                  vector::similarity::cosine(embeddings, $parent.embeddings) as distance
              OMIT embeddings
              FROM idea
              WHERE
                  <-owns<-(user WHERE id = <record> $userId) AND
                  embeddings <|3, 300|> $parent.embeddings AND
                  ($parent.embeddings != NONE AND $parent.embeddings != NULL) AND
                  (embeddings != NONE AND embeddings != NULL) AND
                  content != NONE AND
                  id != $parent.id
              ORDER BY distance DESC
            ) ELSE []
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
            OMIT embeddings
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
        $userId: record
      ) {
        LET $total = count(SELECT VALUE id FROM idea WHERE <-owns<-(user WHERE id = <record> $userId));
        return {
          total: $total
        };
      }
      `;
    };

    function ideasTimestampsIndex() {
      return `
      DEFINE INDEX IF NOT EXISTS idx_idea_created_at
        ON TABLE idea
        FIELDS createdAt;
      DEFINE INDEX IF NOT EXISTS idx_idea_updated_at
        ON TABLE idea
        FIELDS updatedAt;
      DEFINE INDEX IF NOT EXISTS idx_idea_viewed_at
        ON TABLE idea
        FIELDS viewedAt;
      `;
    }

    await db?.query(userGraphFunction());
    await db?.query(userHeavyGraphFunction());
    await db?.query(getIdeaConnections());
    await db?.query(getIdeaDerived());
    await db?.query(getUserIdeas());
    await db?.query(getUserIdeasPaginated());
    await db?.query(getUserIdeaStats());
    await db?.query(ideasTimestampsIndex());
  }

  static attachComputedFieldsToCollection(
    ideas: (IIdea | ISafeIdea)[],
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
          viewedAt: Date;
          contentUpdatedAt: Date;
          embeddingsUpdatedAt: Date;
          contentPlainUpdatedAt: Date;
        }
      >("idea", {
        title: form.title,
        content: form.content,
        contentPlain: this.getPlainContent(form.content),
        contentPlainUpdatedAt: new Date(),
        embeddings: null,
        visibility: "private",
        contentUpdatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        viewedAt: new Date(),
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
            contentPlain: this.getPlainContent(form.content),
            contentPlainUpdatedAt: new Date(),
            embeddings: null,
            contentUpdatedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
            viewedAt: new Date(),
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

  static async getUserIdeas(
    userId: string,
    options?: IIdeaQuery,
  ): Promise<ISafeIdea[] | undefined> {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Database not available");
      }

      const builder = new IdeaQueryBuilder().ownedBy(userId);

      if (options?.sort) {
        builder.sortBy(options.sort.field, options.sort.direction);
      } else {
        builder.sortBy("updatedAt", "desc"); // Default sort
      }

      builder.paginate({
        start: options?.start,
        limit: options?.limit ?? 50,
      });

      const { query, params } = builder.build();

      const results = await db.query<[ISafeIdea[]]>(query, params);

      if (!results) {
        console.error("Something went wrong, no results found.");
        return undefined;
      }
      const [ideas] = results;
      return ideas;
    } catch (err) {
      console.error("Something went wrong getting user ideas", err);
      return undefined;
    }
  }

  static async getAllUserIdeas(userId: string) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Database connection not established");
      }

      const builder = new IdeaQueryBuilder().ownedBy(userId);

      builder.sortBy("updatedAt", "desc");

      const { query, params } = builder.build();

      const results = await db.query<[ISafeIdea[]]>(query, params);

      if (!results) {
        console.error("Something went wrong, no results found.");
        return undefined;
      }
      const [ideas] = results;
      return ideas;
    } catch (err) {
      console.error("Something went wrong getting user ideas", err);
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

  static async getUserRecentIdeas(userId: string | RecordId, limit: number) {
    try {
      const db = await getDatabase();
      const results = await db?.query<[ISafeIdea[]]>(
        `
        SELECT
          *
        OMIT embeddings
        FROM idea
        WHERE
          <-owns<-(user WHERE id = <record> $userId)
        ORDER BY
          updatedAt DESC
        LIMIT <int> $limit;
          `,
        {
          userId: new StringRecordId(userId),
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
    userId: string | RecordId,
  ): Promise<IUserIdeaStats | undefined> {
    try {
      const db = await getDatabase();
      const results = await db?.run<IUserIdeaStats>("fn::get_user_idea_stats", [
        new StringRecordId(userId),
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
  ): Promise<ISafeUser[] | undefined>;
  static async getIdeaOwners(
    ideaId: string,
    safety: "public",
  ): Promise<IPublicUser[] | undefined>;
  static async getIdeaOwners(
    ideaId: string,
    safety: "none",
  ): Promise<IUser[] | undefined>;
  static async getIdeaOwners(
    ideaId: string,
    safety: "public" | "safe" | "none" = "safe",
  ) {
    try {
      const db = await getDatabase();
      const results = await db?.query<[IUser[]]>(
        `
        SELECT VALUE
          <-owns<-user.{
            id,
            firstName,
            lastName,
            email,
            createdAt,
            updatedAt
        } as user
        FROM ONLY <record> $ideaId
        FETCH user;
        `,
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

  static filterSafeFields(idea: IIdea): ISafeIdea;
  static filterSafeFields(idea: IIdea[]): ISafeIdea[];
  static filterSafeFields(idea: IIdea | IIdea[]): ISafeIdea | ISafeIdea[] {
    if (Array.isArray(idea)) {
      return idea.map((u) => this.filterSafeFields(u)) as ISafeIdea[];
    }
    const { embeddings, ...safeUser } = idea;
    return safeUser as ISafeIdea;
  }

  static filterViewOnlyFields(idea: IIdea): IViewOnlyIdea;
  static filterViewOnlyFields(idea: IIdea[]): IViewOnlyIdea[];
  static filterViewOnlyFields(
    idea: IIdea | IIdea[],
  ): IViewOnlyIdea | IViewOnlyIdea[] {
    if (Array.isArray(idea)) {
      return idea.map((i) => this.filterViewOnlyFields(i));
    }

    const { id, title, content, createdAt, updatedAt } = idea;

    return {
      id,
      title,
      content,
      createdAt,
      updatedAt,
    };
  }

  static async share(
    ideaId: string,
    userId: string,
    accessLevel: IIdeaShareAccess = "viewonly",
  ): Promise<boolean> {
    const query = `
      RELATE $ideaId->shared_with->$userId CONTENT {
        accessLevel: $accessLevel,
        createdAt: $now,
      };
    `;

    try {
      const db = await getDatabase();
      const result = await db?.query<[IIdeaShare[]]>(query, {
        ideaId: new StringRecordId(ideaId),
        userId: new StringRecordId(userId),
        accessLevel,
        now: new Date(),
      });
      return !!(result && result[0] && result[0].length > 0);
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  static async unshare(ideaId: string, userId: string): Promise<boolean> {
    const query = `
      DELETE shared_with WHERE in = $ideaId AND out = $userId;
    `;

    try {
      const db = await getDatabase();
      const result = await db?.query<[IIdeaShare[]]>(query, {
        ideaId: new StringRecordId(ideaId),
        userId: new StringRecordId(userId),
      });
      return !!(result && result[0] && result[0].length > 0);
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  static async checkShareAccess(
    ideaId: string,
    userId: string,
  ): Promise<IIdeaShareAccess | null> {
    const query = `
      SELECT
          accessLevel
      FROM shared_with
      WHERE in = $ideaId AND out = $userId;
    `;

    try {
      const db = await getDatabase();
      const result = await db?.query<[{ accessLevel: IIdeaShareAccess }[]]>(
        query,
        {
          ideaId: new StringRecordId(ideaId),
          userId: new StringRecordId(userId),
        },
      );

      if (result && result[0] && result[0].length > 0) {
        return result[0][0].accessLevel;
      }

      return null;
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  static async getShares(
    ideaId: string,
  ): Promise<IIdeaShareDetails[] | undefined> {
    const query = `
      SELECT
          accessLevel,
          out.{
              id,
              firstName,
              lastName,
              email,
              createdAt,
              updatedAt
          } AS user
      FROM shared_with
      WHERE in = $ideaId
      FETCH user;
    `;

    try {
      const db = await getDatabase();
      const result = await db?.query<
        [{ accessLevel: IIdeaShareAccess; user: IPublicUser }[]]
      >(query, {
        ideaId: new StringRecordId(ideaId),
      });

      if (result && result[0]) {
        const shares = result[0];
        return shares.map((share) => ({
          accessLevel: share.accessLevel,
          user: share.user,
        }));
      }

      return [];
    } catch (e) {
      console.error(e);
      return undefined;
    }
  }

  static async getSharedWithUser(
    userId: string,
  ): Promise<IViewOnlyIdea[] | undefined> {
    try {
      const db = await getDatabase();
      const query = `
        SELECT VALUE
          <-shared_with<-idea.{
            id,
            title,
            content,
            createdAt,
            updatedAt
          } as idea
        FROM ONLY
          <record> $userId
        FETCH idea;
      `;

      const result = await db?.query<[IIdea[]]>(query, {
        userId,
      });

      if (result && result[0]) {
        return this.filterViewOnlyFields(result[0]);
      }

      return [];
    } catch (e) {
      console.error(e);
      return undefined;
    }
  }

  static async get(
    id: string | RecordId,
    safety?: "public",
  ): Promise<ISafeIdea>;
  static async get(id: string | RecordId, safety?: "full"): Promise<IIdea>;
  static async get(
    id: string | RecordId,
    safety: "public" | "full" = "public",
  ): Promise<ISafeIdea | IIdea | undefined> {
    try {
      const db = await getDatabase();
      const recordId = typeof id === "string" ? new StringRecordId(id) : id;
      const result = await db?.select<IIdea>(recordId);
      if (!result) {
        console.error(`Idea with id ${id} not found.`);
        return;
      }
      if (safety === "public") {
        return this.filterSafeFields(result);
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

  static async getAccessible(
    id: string | RecordId,
    userId: string,
  ): Promise<IIdea | ISafeIdea | IViewOnlyIdea | undefined>;
  static async getAccessible(
    id: string | RecordId,
  ): Promise<ISafeIdea | undefined>;
  static async getAccessible(
    id: string | RecordId,
    userId?: string,
  ): Promise<IIdea | ISafeIdea | IViewOnlyIdea | undefined> {
    try {
      const db = await getDatabase();
      const recordId = typeof id === "string" ? new StringRecordId(id) : id;
      const idea = await db?.select<IIdea>(recordId);

      if (!idea) {
        console.error(`Idea with id ${id} not found.`);
        return undefined;
      }

      const ideaIdStr = idea.id.toString();

      if (userId) {
        const isOwner = await Idea.checkUserOwnership(ideaIdStr, userId);
        if (isOwner) {
          return idea;
        }

        const shareAccess = await Idea.checkShareAccess(ideaIdStr, userId);
        if (shareAccess === "viewonly") {
          return this.filterViewOnlyFields(idea);
        }
        // In the future, 'editor' access would be handled here
      }

      if (idea.visibility === "public") {
        return this.filterViewOnlyFields(idea);
      }

      return undefined;
    } catch (err) {
      console.error(err);
      return undefined;
    }
  }

  static async getFull(id: string | RecordId): Promise<IIdea | undefined> {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Error getting database.");
      }
      return db.select<IIdea>(new StringRecordId(id));
    } catch (error) {
      logger.error("Error getting full idea", { error });
      return undefined;
    }
  }

  static async all(safety: "public"): Promise<ISafeIdea[]>;
  static async all(safety: "full"): Promise<IIdea[]>;
  static async all(
    safety: "public" | "full" = "public",
  ): Promise<ISafeIdea[] | IIdea[] | undefined> {
    try {
      const db = await getDatabase();
      const result = await db?.select<IIdea>("idea");
      if (!result) {
        console.error("No ideas found.");
        return undefined;
      }
      if (safety === "public") {
        return this.filterSafeFields(result);
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
          ...this.filterSafeFields(i),
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

  static async graphHeavy(userId: string): Promise<IDBGraph | undefined> {
    try {
      const db = await getDatabase();
      const graph = await db?.run<Omit<IDBGraph, "flags">>(
        "fn::user_graph_heavy",
        [userId],
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
          ...this.filterSafeFields(i),
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
        updater.contentPlain = form.content
          ? this.getPlainContent(form.content)
          : "";
        updater.contentPlainUpdatedAt = new Date();
      }
      if ("title" in form && !("titleGeneratedAt" in form)) {
        updater.titleGeneratedAt = undefined;
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

  static getPlainContent(original_content: string): string {
    return htmlToMarkdown(original_content);
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
  ) {
    try {
      const db = await getDatabase();
      const idea = await Idea.get(rootNodeId, "full");
      if (!idea) {
        throw new Error(`Idea not found.`);
      }
      if (!idea.embeddings) {
        await Idea.loadEmbeddings(rootNodeId, true);
      }
      if (!idea.embeddings) {
        throw new Error(
          "Idea has no embedding vector and couldn't be computed.",
        );
      }
      // TODO: this should only return ideas, nothing else.
      const results = await Search.searchByEmbedding(userId, idea.embeddings, {
        limit: 10,
      });
      if (!results) {
        throw new Error("Search failed findings similar ideas.");
      }
      const ideas: (IIdea & {
        distance: number;
        derivedList: IIdeaDerived[];
      })[] = results
        .map((r) => {
          if (r.value.type === "idea") {
            return r.value as IIdea & {
              type: string;
              distance: number;
              derivedList: IIdeaDerived[];
            };
          }
        })
        .filter((v) => !!v);
      const filteredIdeas = ideas.filter((idea) => {
        return idea.id.toString() !== rootNodeId;
      });
      const withDerivedMapped = filteredIdeas.map((idea) => {
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

  static async semanticSearch(userId: string | RecordId, embedding: number[]) {
    try {
      const db = await getDatabase();
      const ideas = await db?.run<IIdeaAsRelation[]>(
        "fn::search_similar_to_embeddings",
        [embedding, userId],
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

  static async generateTitle(content: string) {
    try {
      const lm = getLM();
      const title = await lm.utils.entitle(
        content,
        `
        You are an expert archivist tasked with creating a title for a personal knowledge note.
        Your goal is to make the note easily findable and understandable at a glance from a list of hundreds of other notes.

        ## Task
        Generate a title based on the provided note content.

        ## Guiding Principles
        1.  **Specificity is Key:** The title must be specific. Instead of "Networking Ideas," use "Configuring VLANs for IoT Device Isolation on UniFi."
        2.  **Concise & Scannable:** Use the fewest words possible without sacrificing specificity. The ideal title length is 3-8 words.
        3.  **Keyword-Oriented:** Include the primary nouns, technologies, or concepts (e.g., "Permaculture," "TypeScript," "Zod," "VLAN") that someone would use to search for this note.
        4.  **Reflect the Note's Purpose:**
            * If the note is a question or an investigation, phrase the title as a concise summary of that question (e.g., "Methods for Improving Soil Compaction").
            * If the note is a plan or work-in-progress, the title should reflect that goal (e.g., "Design for a 5-Acre Syntropic Agroforestry System").
            * If the note is a statement of fact or a learned lesson, the title should be a declarative statement (e.g., "Type Inference from Zod Schemas").
        `,
      );

      return title;
    } catch (err) {
      console.error(`Error during generateSummary`, err);
      return null;
    }
  }

  static async giveGenerativeTitle(ideaId: string | RecordId) {
    try {
      const idea = await Idea.get(ideaId);
      if (!idea) {
        throw new Error("Error getting idea");
      }
      if (!idea.content) {
        return await Idea.update(ideaId, {
          title: "Untitled Idea",
          titleGeneratedAt: undefined,
        });
      }
      const title = await Idea.generateTitle(idea.contentPlain || idea.content);
      if (!title) {
        throw new Error("Error getting the title");
      }
      return await Idea.update(ideaId, {
        title,
        titleGeneratedAt: new Date(),
      });
    } catch (error) {
      console.error("Error generating title for idea");
      return undefined;
    }
  }

  static getEmbeddableContent(idea: IIdea) {
    const plaintextContent = this.getPlainContent(idea.content);
    const withTitle = `${idea.title}\n---\n${plaintextContent}`;
    return withTitle;
  }

  static async loadEmbeddings(id: string | RecordId, force = false) {
    try {
      const db = await getDatabase();
      const result = await db?.select<IIdea & { id: RecordId }>(
        new StringRecordId(id),
      );
      if (!result) {
        console.error(`Idea with id ${id} not found.`);
        return undefined;
      }
      return await Idea.updateEmbeddings(result, force);
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
      const embedding = getEmbedder();
      const embeddableContent = Idea.getEmbeddableContent(idea);
      // if (
      //   !embeddableContent ||
      //   embeddableContent.length > embeddableContentLimit
      // ) {
      //   console.log("Not embedding over the content limit...")
      //   await Idea.update(idea.id, {
      //     embeddings: [],
      //     embeddingsUpdatedAt: new Date(),
      //   });
      //   return undefined;
      // }
      // ^^ This can probably be deleted the next time someone comes by, but it's here for safe keeping
      // The idea is that now the embedContent will automatically truncate the characters based on model considerations
      // So we tune there instead
      const vector = await embedding.embedContent(embeddableContent);
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
      const e = getEmbedder();
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
      const embeddings = await e.embedContents(justContent);
      if (!embeddings) {
        throw new Error("No embeddings generated");
      }
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
            contentPlain: this.getPlainContent(update.content),
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
  private _idea: IIdea | ISafeIdea | undefined;

  constructor(ideaId: string | RecordId) {
    this._ideaId = ideaId;
    (async () => {
      this._idea = await Idea.getFull(ideaId);
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
