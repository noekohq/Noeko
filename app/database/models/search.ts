import { RecordId, StringRecordId } from "surrealdb";
import { IIdea } from "./ideas";
import {
  ISearchOverview,
  ISearchResult,
  ISearchResultValue,
} from "../../services/Search";
import { logger } from "../../services/Logger";
import { getDatabase } from "../db";
import { Search } from "../../services/Search";
import { parseIncompleteJsonArray } from "../../utils/processing";

export type ISpyglassSearch = {
  id: string | RecordId;
  baseQuery: string;
  results?: ISearchResultValue[];
  resultConnections?: ISearchConnection[];
  fullResults?: ISearchResult[];
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

export type ISpyglassGeneratorType =
  | "error"
  | "completed"
  | "results_loaded"
  | "findings_generating"
  | "findings_chunk"
  | "findings_loaded"
  | "overview_generating"
  | "overview_chunk"
  | "overview_completed";

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
              (SELECT * FROM found WHERE in = $spyglassRecord) as resultConnections,
              (SELECT * OMIT embeddings FROM ->found->idea) as results
            FROM ONLY <record> $spyglassRecord
            FETCH results;
          RETURN $search;
        }
        `;
      };

      const getSpyglassHistoryFunction = () => {
        return `
          DEFINE FUNCTION OVERWRITE fn::get_spyglass_history(
            $userId: record,
            $page: int,
            $pageSize: int
          ) {
            LET $history =
              SELECT
                *,
                (SELECT * FROM found WHERE in = $spyglassRecord) as resultConnections,
                (SELECT * OMIT embeddings FROM ->found->idea) as results
              FROM spyglass
              WHERE <-searched<-(user WHERE id = $userId)
              ORDER BY createdAt DESC
              LIMIT $pageSize
              START ($page * $pageSize)
              FETCH results;
            RETURN $history;
          }
          `;
      };

      const getSpyglassHistoryLightweightFunction = () => {
        return `
        DEFINE FUNCTION OVERWRITE fn::get_spyglass_history_lightweight(
          $userId: record,
          $page: int,
          $pageSize: int
        ) {
          LET $history =
            SELECT
              *
            FROM spyglass
            WHERE <-searched<-(user WHERE id = $userId)
            ORDER BY createdAt DESC
            LIMIT $pageSize
            START ($page * $pageSize)
            FETCH results;
          RETURN $history;
        }
        `;
      };

      db.query(getSpyglassFunction());
      db.query(getSpyglassHistoryFunction());
      db.query(getSpyglassHistoryLightweightFunction());
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
      if (
        search.resultConnections &&
        search.results &&
        search.results.length > 0
      ) {
        search.fullResults = await SpyglassSearch.mapMultipleConnections(
          search.resultConnections,
          search.results,
        );
      }
      return search;
    } catch (error) {
      logger.error("Error getting spyglass search", { id, error });
    }
  }

  public static async getHistory(
    userId: string | RecordId,
    page: number = 0,
    pageSize: number = 10,
  ) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Database not initialized");
      }
      const history = await db.run<ISpyglassSearch[]>(
        "fn::get_spyglass_history",
        [new StringRecordId(userId), page, pageSize],
      );
      return history;
    } catch (error) {
      logger.error("Error getting spyglass history", { userId, error });
    }
  }

  public static async getHistoryLightweight(
    userId: string | RecordId,
    page: number = 0,
    pageSize: number = 10,
  ) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Database not initialized");
      }
      const history = await db.run<ISpyglassSearch[]>(
        "fn::get_spyglass_history_lightweight",
        [new StringRecordId(userId), page, pageSize],
      );
      return history;
    } catch (error) {
      logger.error("Error getting spyglass history", { userId, error });
    }
  }

  static async checkUserOwnership(spyglassId: string, userId: string) {
    try {
      const db = await getDatabase();
      const result = await db?.query<[number]>( // Expecting an array with one object: [{ count: number }]
        `count(SELECT id FROM searched WHERE in = $userId AND out = $spyglassId);`,
        {
          userId: new StringRecordId(userId),
          spyglassId: new StringRecordId(spyglassId),
        },
      );

      if (result && result[0] && result[0] > 0) {
        return true;
      }
      return false;
    } catch (err) {
      console.error(
        `Error during checkUserOwnership for spyglass "${spyglassId}":`,
        err,
      );
      return false;
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
    source: ISearchResultValue,
  ): Promise<ISearchResult> {
    const getType = () => {
      if (source.id.toString().startsWith("idea")) {
        return "idea";
      }
      if (source.id.toString().startsWith("user_file")) {
        return "file";
      }
      return "idea";
    };
    source.type = getType();
    return {
      id: connection.out,
      score: connection.score,
      value: source,
      debug: connection.debug,
    } satisfies ISearchResult;
  }

  public static async mapMultipleConnections(
    connections: ISearchConnection[],
    sources: ISearchResultValue[],
  ): Promise<ISearchResult[]> {
    return Promise.all(
      connections.map((connection, i) => {
        const source = sources[i];
        return this.mapSearchConnectionToSearchResult(connection, source);
      }),
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
      if (!search.resultConnections) {
        throw new Error("Did not load result relations");
      }
      if (!search.fullResults) {
        throw new Error("Did not load full results");
      }
      const analysis = await Search.getOverviewFromResults(
        search.baseQuery,
        search.fullResults,
      );
      await db.merge<ISpyglassSearch>(searchId, { analysis });
      return analysis;
    } catch (error) {
      logger.error("Error loading analysis", { searchId, error });
      throw error;
    }
  }

  public static async loadFindings(
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
      if (!search.resultConnections) {
        throw new Error("Did not load result relations");
      }
      if (!search.fullResults) {
        throw new Error("Did not load full results");
      }
      const findings = await Search.getFindingsFromResults(
        search.baseQuery,
        search.fullResults,
      );
      if (!findings) {
        throw new Error("No findings found");
      }
      await db.merge<ISpyglassSearch>(searchId, {
        analysis: {
          findings,
          overview: "",
        },
      });
      return findings;
    } catch (error) {
      logger.error("Error loading analysis", { searchId, error });
      throw error;
    }
  }

  public static async loadOverview(
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
      if (!search.analysis) {
        throw new Error("No analysis found");
      }
      if (!search.analysis.findings) {
        throw new Error("No findings found");
      }
      const overview = await Search.getOverviewFromFindings(
        search.baseQuery,
        search.analysis.findings,
      );
      if (!overview) {
        throw new Error("No overview found");
      }
      await db.merge<ISpyglassSearch>(searchId, {
        analysis: {
          findings: search.analysis.findings,
          overview,
        },
      });
      return overview;
    } catch (error) {
      logger.error("Error loading overview", { searchId, error });
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
    {
      type: ISpyglassGeneratorType;
      statusText: string;
      data: ISpyglassSearch | string;
    },
    ISpyglassSearch | undefined, // The final return type of the generator
    unknown
  > {
    let resultsTime: number | null = null;
    let findingsTime: number | null = null;
    let overviewTime: number | null = null;

    try {
      const startTime = Date.now();
      const db = await getDatabase();
      if (!db) {
        const errorMessage = "Database not initialized";
        logger.error(errorMessage, { spyglassId });
        yield {
          type: "error",
          data: errorMessage,
          statusText: "There was an error",
        };
        return undefined;
      }

      const getSpyglass = async () => await SpyglassSearch.get(spyglassId);
      let spyglass = await getSpyglass();
      if (!spyglass) {
        const errorMessage = "Search not found";
        logger.error(errorMessage, { spyglassId });
        yield {
          type: "error",
          data: errorMessage,
          statusText: "Something went wrong...",
        };
        return undefined;
      }

      if (!spyglass.results || !spyglass.results.length) {
        try {
          await SpyglassSearch.loadResults(userId, spyglass?.id);
          spyglass = await getSpyglass();
          if (!spyglass) {
            throw new Error("Spyglass not found");
          }
          yield {
            type: "results_loaded",
            statusText: `Reading ${spyglass.results?.length || "some"} results...`,
            data: spyglass,
          };
        } catch (e) {
          const errorMessage = "Error loading search results";
          logger.error(errorMessage, {
            userId,
            searchId: spyglassId,
            error: e,
          });
          yield {
            type: "error",
            statusText: "Something went wrong...",
            data: errorMessage,
          };
          return undefined;
        }
        resultsTime = Date.now();
      }

      try {
        if (!spyglass.fullResults) {
          throw new Error("Did not load full results");
        }

        yield {
          type: "findings_generating",
          statusText: "Generating findings...",
          data: spyglass,
        };

        let completeFindingsJSON = "";
        for await (const findingChunk of Search.generateFindingsFromResults(
          spyglass.baseQuery,
          spyglass.fullResults,
        )) {
          completeFindingsJSON += findingChunk;
          yield {
            type: "findings_chunk",
            statusText: "Generating findings...",
            data: findingChunk,
          };
        }

        // Save the complete findings
        const db = await getDatabase();
        if (!db) {
          throw new Error("Database not initialized");
        }
        const completeFindings = parseIncompleteJsonArray(completeFindingsJSON);
        await db.merge<ISpyglassSearch>(spyglass.id, {
          analysis: {
            findings: completeFindings,
            overview: "",
          },
        });

        spyglass = await SpyglassSearch.get(spyglass.id);
        if (!spyglass) {
          throw new Error("Spyglass not found");
        }

        yield {
          type: "findings_loaded",
          statusText: `Generated ${completeFindings.length} findings from ${spyglass.results?.length || "some"} results...`,
          data: spyglass,
        };
        findingsTime = Date.now();
      } catch (e) {
        const errorMessage = "Error generating findings";
        logger.error(errorMessage, {
          userId,
          searchId: spyglass?.id,
          error: e,
        });
        yield {
          type: "error",
          data: errorMessage,
          statusText: "Something went wrong...",
        };
        return undefined;
      }

      // Phase 2: Stream Overview Generation
      if (spyglass.analysis && spyglass.analysis.findings.length > 0) {
        try {
          yield {
            type: "overview_generating",
            statusText: "Generating overview...",
            data: spyglass,
          };

          let completeOverview = "";
          for await (const chunk of Search.generateOverviewFromFindings(
            spyglass.baseQuery,
            spyglass.analysis.findings,
          )) {
            completeOverview += chunk;
            yield {
              type: "overview_chunk",
              statusText: "Generating overview...",
              data: chunk,
            };
          }

          // Save the complete overview
          const db = await getDatabase();
          if (!db) {
            throw new Error("Database not initialized");
          }
          await db.merge<ISpyglassSearch>(spyglass.id, {
            analysis: {
              findings: spyglass.analysis.findings,
              overview: completeOverview,
            },
          });

          spyglass = await SpyglassSearch.get(spyglass.id);
          if (!spyglass) {
            throw new Error("Spyglass not found");
          }

          yield {
            type: "overview_completed",
            statusText: "Overview generated successfully",
            data: spyglass,
          };
          overviewTime = Date.now();
        } catch (e) {
          const errorMessage = "Error generating overview";
          logger.error(errorMessage, {
            userId,
            searchId: spyglass?.id,
            error: e,
          });
          yield {
            type: "error",
            data: errorMessage,
            statusText: "Something went wrong...",
          };
          return undefined;
        }
      }

      // Stage 4: Completion
      // Fetch the final, complete search record
      const finalSearch = await SpyglassSearch.get(spyglass.id);
      if (!finalSearch) {
        const errorMessage =
          "Failed to retrieve final search record after completion";
        logger.error(errorMessage, { userId, searchId: spyglass.id });
        yield {
          type: "error",
          data: errorMessage,
          statusText: "Something went wrong...",
        };
        return undefined;
      }

      const resultsDuration = resultsTime
        ? (resultsTime - startTime) / 1000
        : null;
      const findingsDuration =
        findingsTime && resultsTime
          ? (findingsTime - resultsTime) / 1000
          : null;
      const overviewDuration =
        overviewTime && findingsTime
          ? (overviewTime - findingsTime) / 1000
          : null;

      const formatDecimal = (value: number | null) =>
        value?.toFixed(2) ?? "N/A";

      const totalCitations = finalSearch.analysis?.findings.length;

      const statusText = `Found ${finalSearch.results?.length ?? 0} result${finalSearch.results?.length === 1 ? "" : "s"} in ${formatDecimal(resultsDuration)}s. Generated ${totalCitations} findings in ${formatDecimal(findingsDuration)}s and overview in ${formatDecimal(overviewDuration)}s`;

      yield { type: "completed", statusText, data: finalSearch };
      return finalSearch; // The final value returned by the generator
    } catch (error) {
      const errorMessage = "An unexpected error occurred during spyglass run";
      logger.error(errorMessage, { userId, error });
      yield {
        type: "error",
        data: errorMessage,
        statusText: "Something went wrong...",
      };
      return undefined;
    }
  }
}
