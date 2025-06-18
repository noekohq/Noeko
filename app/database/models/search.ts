import { RecordId, StringRecordId } from "surrealdb";
import { Idea, IIdea } from "./ideas";
import {
  ISearchOverview,
  ISearchResult,
  ISearchResultValue,
} from "../../services/Search";
import { logger } from "../../services/Logger";
import { getDatabase } from "../db";
import { Search } from "../../services/Search";
import { UserFile } from "./userfile";

export type ISpyglassSearch = {
  id: string | RecordId;
  baseQuery: string;
  results?: ISearchConnection[];
  analysis: ISearchOverview | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ISpyglassSearchForm = Omit<
  ISpyglassSearch,
  "id" | "results" | "analysis" | "createdAt" | "updatedAt"
>;

export type ISpyglassSearchCreator = Omit<ISpyglassSearch, "id">;

export type ISearchOwnership = {
  id: string | RecordId;
  in: string | RecordId;
  out: string | RecordId;
};

export type ISearchConnection = {
  id: string | RecordId;
  in: string | RecordId;
  out: string | RecordId;
  highlightedText: string;
  score: number;
  debug?: {
    semanticScore?: number;
    ftsContentScore?: number;
    ftsTitleScore?: number;
    exactTitleBonus?: number;
    source: "semantic" | "fts" | "hybrid";
  };
  createdAt: Date;
  updatedAt: Date;
};

export class SpyglassSearch {
  constructor() {}

  public static async up() {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Database not initialized, couldn't run up function");
      }
      const getSpyglassFunction = () => {
        return `
        DEFINE FUNCTION OVERWRITE fn::get_spyglass_record(
          $spyglassRecord: record,
        ) {
          LET $search =
            SELECT
              *,
              ->found->idea as results
            FROM ONLY $spyglassRecord
          RETURN $search;
        }
        `;
      };
      db.query(getSpyglassFunction());
    } catch (error) {
      logger.error("Error creating spyglass search table", { error });
    }
  }

  public static async down() {}

  public static async create(
    userId: string | RecordId,
    form: ISpyglassSearchForm,
  ) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Database not initialized");
      }
      const result = await db.create<ISpyglassSearch, ISpyglassSearchCreator>(
        "spyglass",
        {
          baseQuery: form.baseQuery,
          createdAt: new Date(),
          updatedAt: new Date(),
          analysis: null,
        },
      );
      if (!result[0]) {
        throw new Error("Failed to create spyglass search");
      }
      const [spyglassSearch] = result;
      await db.query(`RELATE $userId->searched->$spyglassId;`, {
        userId: new StringRecordId(userId),
        spyglassId: new StringRecordId(spyglassSearch.id),
      });
      return spyglassSearch;
    } catch (error) {
      logger.error("Error creating spyglass search", { userId, form, error });
    }
  }

  public static async get(id: string | RecordId) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Database not initialized");
      }
      const search = await db.run<ISpyglassSearch>("fn::get_spyglass_record", [
        new StringRecordId(id),
      ]);
      if (!search) {
        throw new Error("Search not found");
      }
      return search;
    } catch (error) {
      logger.error("Error getting spyglass search", { id, error });
    }
  }

  public static async loadResults(
    userId: string | RecordId,
    searchId: string | RecordId,
  ) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Database not initialized");
      }
      const search = await db.select<ISpyglassSearch>(
        new StringRecordId(searchId),
      );
      if (!search) {
        throw new Error("Search not found");
      }
      const results = await Search.comprehensiveSearch(
        userId.toString(),
        search.baseQuery,
      );
      if (!results) {
        throw new Error("Failed to load search results");
      }
      const relationQueries = results.map(async (result) => {
        const fromId = new StringRecordId(search.id);
        const toId = new StringRecordId(result.id);
        return db.query<[ISearchConnection]>(
          `RELATE $fromId->found->$toId CONTENT $content;`,
          {
            fromId: fromId,
            toId: toId,
            content: {
              score: result.score,
              highlightText: result.highlightText,
              debug: result.debug,
            },
          },
        );
      });
      const relations = await Promise.all(relationQueries);
      return relations;
    } catch (error) {
      logger.error("Error loading search results", { userId, searchId, error });
      return undefined;
    }
  }

  public static async mapSearchConnectionToSearchResult(
    connection: ISearchConnection,
  ): Promise<ISearchResult> {
    const loadRecord = async (): Promise<ISearchResultValue | undefined> => {
      if (connection.out.toString().startsWith("idea")) {
        return {
          ...(await Idea.get(connection.out, "full")),
          type: "idea",
        } satisfies ISearchResultValue;
      }
      if (connection.out.toString().startsWith("user_file")) {
        return {
          ...(await UserFile.get(connection.out)),
          type: "file",
        } satisfies ISearchResultValue;
      }
    };

    return {
      id: connection.out,
      score: connection.score,
      value: await loadRecord(),
      debug: connection.debug,
    } satisfies ISearchResult;
  }

  public static async mapMultipleConnections(
    connections: ISearchConnection[],
  ): Promise<ISearchResult[]> {
    return Promise.all(
      connections.map((connection) =>
        this.mapSearchConnectionToSearchResult(connection),
      ),
    );
  }

  public static async loadAnalysis(
    userId: string | RecordId,
    searchId: string | RecordId,
  ) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Database not initialized");
      }
      const search = await SpyglassSearch.get(searchId);
      if (!search) {
        throw new Error("Search not found");
      }
      if (!search.results) {
        throw new Error("Tried to run analysis on an empty search");
      }
      const mappedResults = await this.mapMultipleConnections(search.results);
      const analysis = await Search.getOverviewFromResults(
        search.baseQuery,
        mappedResults,
      );
      await db.merge<ISpyglassSearch>(searchId, { analysis });
      return analysis;
    } catch (error) {
      logger.error("Error loading analysis", { searchId, error });
      throw error;
    }
  }

  public static async runSpyglass(userId: string, query: string) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Database not initialized");
      }
      const search = await SpyglassSearch.create(userId, {
        baseQuery: query,
      });
      if (!search) {
        throw new Error("Failed to create search");
      }
      await SpyglassSearch.loadResults(userId, search.id);
      await SpyglassSearch.loadAnalysis(userId, search.id);
      return await SpyglassSearch.get(search.id);
    } catch (error) {
      logger.error("Error running spyglass", { query, error });
      throw error;
    }
  }

  public static async *runSpyglassGenerator(
    userId: string | RecordId,
    spyglassId: string | RecordId,
  ): AsyncGenerator<
    | { status: "results_loading"; data: ISpyglassSearch }
    | { status: "analysis_loading"; data: ISpyglassSearch }
    | { status: "completed"; data: ISpyglassSearch }
    | { status: "error"; message: string; originalError: any },
    ISpyglassSearch | undefined, // The final return type of the generator
    unknown
  > {
    try {
      const db = await getDatabase();
      if (!db) {
        const errorMessage = "Database not initialized";
        logger.error(errorMessage, { spyglassId });
        yield {
          status: "error",
          message: errorMessage,
          originalError: new Error(errorMessage),
        };
        return undefined;
      }

      const getSpyglass = async () => await SpyglassSearch.get(spyglassId);
      const spyglass = await getSpyglass();
      if (!spyglass) {
        const errorMessage = "Search not found";
        logger.error(errorMessage, { spyglassId });
        yield {
          status: "error",
          message: errorMessage,
          originalError: new Error(errorMessage),
        };
        return undefined;
      }

      try {
        await SpyglassSearch.loadResults(userId, spyglass?.id);
        const s = await getSpyglass();
        if (!s) {
          throw new Error("Spyglass not found");
        }
        yield { status: "results_loading", data: s };
      } catch (e) {
        const errorMessage = "Error loading search results";
        logger.error(errorMessage, { userId, searchId: spyglassId, error: e });
        yield { status: "error", message: errorMessage, originalError: e };
        return undefined;
      }

      try {
        await SpyglassSearch.loadAnalysis(userId, spyglass.id);
        const s = await getSpyglass();
        if (!s) {
          throw new Error("Spyglass not found");
        }
        yield { status: "analysis_loading", data: s };
      } catch (e) {
        const errorMessage = "Error loading analysis";
        logger.error(errorMessage, { userId, searchId: spyglass.id, error: e });
        yield { status: "error", message: errorMessage, originalError: e };
        return undefined;
      }

      // Stage 4: Completion
      // Fetch the final, complete search record
      const finalSearch = await SpyglassSearch.get(spyglass.id);
      if (!finalSearch) {
        const errorMessage =
          "Failed to retrieve final search record after completion";
        logger.error(errorMessage, { userId, searchId: spyglass.id });
        yield {
          status: "error",
          message: errorMessage,
          originalError: new Error(errorMessage),
        };
        return undefined;
      }

      yield { status: "completed", data: finalSearch };
      return finalSearch; // The final value returned by the generator
    } catch (error) {
      const errorMessage = "An unexpected error occurred during spyglass run";
      logger.error(errorMessage, { userId, error });
      yield { status: "error", message: errorMessage, originalError: error };
      return undefined;
    }
  }
}
