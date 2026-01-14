import { RecordId, StringRecordId } from "surrealdb";
import {
  IConnectableSearchQuery,
  ISearchResult,
  ISearchResultValue,
} from "../../services/Search";
import { logger } from "../../services/Logger";
import { getDatabase } from "../db";
import { Search } from "../../services/Search";
import { parseIncompleteJsonArray } from "../../utils/processing";
import { max_spyglass_finding_amount } from "../../settings";
import Spyglass, { IFinding, ISpyglassIntent } from "../../services/Spyglass";
import { IRabbithole } from "./rabbithole";
import { IConnectable } from "../../services/Graph";
import { User } from "./user";

export type ISearchOverview = {
  overview: string;
  findings: IFinding[];
};

export type ISpyglassSearch = {
  id: string | RecordId;
  baseQuery: string;
  intent?: ISpyglassIntent;
  analysis: ISearchOverview | null;
  createdAt: Date;
  updatedAt: Date;
  results?: ISearchResultValue[];
  resultConnections?: ISearchConnection[];
  fullResults?: ISearchResult[];
  parent?: ISpyglassSearch;
  rabbithole?: IRabbithole;
  scope?: IConnectable[] | (RecordId | StringRecordId)[];
};

export type ISpyglassSearchForm = Omit<
  ISpyglassSearch,
  | "id"
  | "results"
  | "rabbithole"
  | "analysis"
  | "intent"
  | "createdAt"
  | "updatedAt"
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
  | "intent_loaded"
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

export type ISpyglassSearchFollowUpConnection = {
  in: string | RecordId;
  out: string | RecordId;
  createdAt: Date;
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
              (SELECT * OMIT embeddings FROM ->found->(?)) as results,
              (SELECT * FROM ->is_followup_to->spyglass)[0] AS parent,
              (SELECT * FROM <-includes<-rabbithole)[0] AS rabbithole
            FROM ONLY <record> $spyglassRecord
            FETCH results, parent;
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
            START ($page * $pageSize);
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
    options?: {
      rabbitholeId?: string;
      scope?: string[];
    },
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
      if (options?.rabbitholeId) {
        await db.query(`RELATE $rabbitholeId->includes->$spyglassId;`, {
          rabbitholeId: new StringRecordId(options.rabbitholeId),
          spyglassId: new StringRecordId(spyglassSearch.id),
        });
      }
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
        search.fullResults = !!search.results.length
          ? await SpyglassSearch.mapMultipleConnections(
              search.resultConnections,
              search.results,
            )
          : [];
      }
      return search;
    } catch (error) {
      logger.error("Error getting spyglass search", { id, error });
    }
  }

  public static async attachParent(
    to: string | RecordId,
    from: string | RecordId,
  ) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Database not initialized");
      }
      const result = db.query<[ISpyglassSearchFollowUpConnection[]]>(
        `RELATE $child->is_followup_to->$parent CONTENT { createdAt: $now, }`,
        {
          child: new StringRecordId(to),
          parent: new StringRecordId(from),
        },
      );
      if (!result) {
        console.error("No link created.");
        return undefined;
      }
      return result;
    } catch (error) {
      logger.error("Error attaching parent", { to, from, error });
      return undefined;
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

  public static async loadIntent(
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
      const intent = await Spyglass.getIntentFromQuery(
        search.baseQuery,
        search.parent
          ? [
              {
                query: search.parent.baseQuery,
                intent: search.parent.intent?.intent || "General inquiry",
                response: search.parent.analysis?.overview || "",
              },
            ]
          : undefined,
      );
      if (!intent) {
        throw new Error("Failed to load intent");
      }
      await db.merge<ISpyglassSearch>(searchId, { intent });
    } catch (error) {
      logger.error("Error loading search results", { userId, searchId, error });
      return undefined;
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
      const search = await SpyglassSearch.get(searchId);
      if (!search) {
        throw new Error("Search not found");
      }
      const results: ISearchResult[] = [];
      if (search.intent) {
        const searches = search.intent.searches.map((s) => {
          return {
            ...s,
            rabbithole: search.rabbithole,
            tables: s.tables ?? ["idea", "excerpt", "source"],
            vectorSettings: {
              effort: "high",
            },
          } as IConnectableSearchQuery;
        });
        const r = await Spyglass.getResultsFromQueries(
          userId.toString(),
          searches,
        );
        results.push(...r);
      } else {
        const r = await Spyglass.getResults(
          userId.toString(),
          search.baseQuery,
        );
        if (!r) {
          console.error(
            "Couldn't find results in loadResults for: ",
            search.baseQuery,
          );
        }
      }
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
    const getType = (): ISearchResultValue["type"] => {
      if (source.id.toString().startsWith("idea")) {
        return "idea";
      }
      if (source.id.toString().startsWith("task")) {
        return "task";
      }
      if (source.id.toString().startsWith("source")) {
        return "source";
      }
      return source.type;
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
      if (!search.fullResults) {
        throw new Error("Did not load full results");
      }
      if (!search.intent) {
        throw new Error("Search intent not found");
      }
      const findings = await Spyglass.getFindingsFromResults(
        search.baseQuery,
        search.fullResults,
        search.intent,
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
      if (!search.intent) {
        throw new Error("Intent not found");
      }
      const overview = await Spyglass.getOverviewFromFindings(
        search.baseQuery,
        search.analysis.findings,
        search.intent,
        search.fullResults || [],
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

  // public static async *runSpyglassGeneratorOld(
  //   userId: string | RecordId,
  //   spyglassId: string | RecordId,
  // ): AsyncGenerator<
  //   {
  //     type: ISpyglassGeneratorType;
  //     statusText: string;
  //     data: ISpyglassSearch | string;
  //   },
  //   ISpyglassSearch | undefined, // The final return type of the generator
  //   unknown
  // > {
  //   let resultsTime: number | null = null;
  //   let findingsTime: number | null = null;
  //   let overviewTime: number | null = null;

  //   try {
  //     const startTime = Date.now();
  //     const db = await getDatabase();
  //     if (!db) {
  //       const errorMessage = "Database not initialized";
  //       logger.error(errorMessage, { spyglassId });
  //       yield {
  //         type: "error",
  //         data: errorMessage,
  //         statusText: "There was an error",
  //       };
  //       return undefined;
  //     }

  //     const getSpyglass = async () => await SpyglassSearch.get(spyglassId);
  //     let spyglass = await getSpyglass();
  //     if (!spyglass) {
  //       const errorMessage = "Search not found";
  //       logger.error(errorMessage, { spyglassId });
  //       yield {
  //         type: "error",
  //         data: errorMessage,
  //         statusText: "Something went wrong...",
  //       };
  //       return undefined;
  //     }

  //     if (!spyglass.intent) {
  //       try {
  //         await SpyglassSearch.loadIntent(userId, spyglass.id);
  //         spyglass = await getSpyglass();
  //         if (!spyglass) {
  //           throw new Error("Spyglass not found");
  //         }
  //         yield {
  //           type: "intent_loaded",
  //           statusText: "Loading results...",
  //           data: spyglass,
  //         };
  //       } catch (e) {
  //         const errorMessage = "Error loading intent";
  //         logger.error(errorMessage, {
  //           userId,
  //           searchId: spyglassId,
  //           error: e,
  //         });
  //         yield {
  //           type: "error",
  //           data: errorMessage,
  //           statusText: "Something went wrong...",
  //         };
  //         return undefined;
  //       }
  //     }

  //     if (!spyglass.results || !spyglass.results.length) {
  //       try {
  //         await SpyglassSearch.loadResults(userId, spyglass?.id);
  //         spyglass = await getSpyglass();
  //         if (!spyglass) {
  //           throw new Error("Spyglass not found");
  //         }
  //         yield {
  //           type: "results_loaded",
  //           statusText: `Reading ${spyglass.results?.length || "some"} results...`,
  //           data: spyglass,
  //         };
  //       } catch (e) {
  //         const errorMessage = "Error loading search results";
  //         logger.error(errorMessage, {
  //           userId,
  //           searchId: spyglassId,
  //           error: e,
  //         });
  //         yield {
  //           type: "error",
  //           statusText: "Something went wrong...",
  //           data: errorMessage,
  //         };
  //         return undefined;
  //       }
  //       resultsTime = Date.now();
  //     }

  //     try {
  //       if (!spyglass.fullResults) {
  //         throw new Error("Did not load full results");
  //       }
  //       if (!spyglass.intent) {
  //         throw new Error("Spyglass intent not found");
  //       }

  //       yield {
  //         type: "findings_generating",
  //         statusText: "Generating findings...",
  //         data: spyglass,
  //       };

  //       let completeFindingsJSON = "";
  //       for await (const findingChunk of Spyglass.generateFindingsFromResults(
  //         spyglass.baseQuery,
  //         spyglass.fullResults,
  //         spyglass.intent,
  //       )) {
  //         completeFindingsJSON += findingChunk;
  //         yield {
  //           type: "findings_chunk",
  //           statusText: "Generating findings...",
  //           data: findingChunk,
  //         };
  //         const completeFindings =
  //           parseIncompleteJsonArray(completeFindingsJSON);
  //         if (completeFindings.length > max_spyglass_finding_amount) {
  //           throw new Error("Too many findings");
  //         }
  //       }

  //       // Save the complete findings
  //       const db = await getDatabase();
  //       if (!db) {
  //         throw new Error("Database not initialized");
  //       }
  //       const completeFindings = parseIncompleteJsonArray(completeFindingsJSON);
  //       await db.merge<ISpyglassSearch>(spyglass.id, {
  //         analysis: {
  //           findings: completeFindings,
  //           overview: "",
  //         },
  //       });

  //       spyglass = await SpyglassSearch.get(spyglass.id);
  //       if (!spyglass) {
  //         throw new Error("Spyglass not found");
  //       }

  //       yield {
  //         type: "findings_loaded",
  //         statusText: `Generated ${completeFindings.length} findings from ${spyglass.results?.length || "some"} results...`,
  //         data: spyglass,
  //       };
  //       findingsTime = Date.now();
  //     } catch (e) {
  //       const errorMessage = "Error generating findings";
  //       logger.error(errorMessage, {
  //         userId,
  //         searchId: spyglass?.id,
  //         error: e,
  //       });
  //       yield {
  //         type: "error",
  //         data: errorMessage,
  //         statusText: "Something went wrong...",
  //       };
  //       return undefined;
  //     }

  //     // Phase 2: Stream Overview Generation
  //     if (
  //       spyglass.intent &&
  //       spyglass.analysis &&
  //       spyglass.analysis.findings.length > 0
  //     ) {
  //       try {
  //         yield {
  //           type: "overview_generating",
  //           statusText: "Generating overview...",
  //           data: spyglass,
  //         };

  //         let completeOverview = "";
  //         for await (const chunk of Spyglass.generateOverviewFromFindings(
  //           spyglass.baseQuery,
  //           spyglass.analysis.findings,
  //           spyglass.intent,
  //           spyglass.fullResults || [],
  //           spyglass.parent,
  //         )) {
  //           completeOverview += chunk;
  //           yield {
  //             type: "overview_chunk",
  //             statusText: "Generating overview...",
  //             data: chunk,
  //           };
  //         }

  //         // Save the complete overview
  //         const db = await getDatabase();
  //         if (!db) {
  //           throw new Error("Database not initialized");
  //         }
  //         await db.merge<ISpyglassSearch>(spyglass.id, {
  //           analysis: {
  //             findings: spyglass.analysis.findings,
  //             overview: completeOverview,
  //           },
  //         });

  //         spyglass = await SpyglassSearch.get(spyglass.id);
  //         if (!spyglass) {
  //           throw new Error("Spyglass not found");
  //         }

  //         yield {
  //           type: "overview_completed",
  //           statusText: "Overview generated successfully",
  //           data: spyglass,
  //         };
  //         overviewTime = Date.now();
  //       } catch (e) {
  //         const errorMessage = "Error generating overview";
  //         logger.error(errorMessage, {
  //           userId,
  //           searchId: spyglass?.id,
  //           error: e,
  //         });
  //         yield {
  //           type: "error",
  //           data: errorMessage,
  //           statusText: "Something went wrong...",
  //         };
  //         return undefined;
  //       }
  //     }

  //     // Stage 4: Completion
  //     // Fetch the final, complete search record
  //     const finalSearch = await SpyglassSearch.get(spyglass.id);
  //     if (!finalSearch) {
  //       const errorMessage =
  //         "Failed to retrieve final search record after completion";
  //       logger.error(errorMessage, { userId, searchId: spyglass.id });
  //       yield {
  //         type: "error",
  //         data: errorMessage,
  //         statusText: "Something went wrong...",
  //       };
  //       return undefined;
  //     }

  //     const resultsDuration = resultsTime
  //       ? (resultsTime - startTime) / 1000
  //       : null;
  //     const findingsDuration =
  //       findingsTime && resultsTime
  //         ? (findingsTime - resultsTime) / 1000
  //         : null;
  //     const overviewDuration =
  //       overviewTime && findingsTime
  //         ? (overviewTime - findingsTime) / 1000
  //         : null;

  //     const formatDecimal = (value: number | null) =>
  //       value?.toFixed(2) ?? "N/A";

  //     const totalCitations = finalSearch.analysis?.findings.length;

  //     const statusText = `Found ${finalSearch.results?.length ?? 0} result${finalSearch.results?.length === 1 ? "" : "s"} in ${formatDecimal(resultsDuration)}s. Generated ${totalCitations} findings in ${formatDecimal(findingsDuration)}s and overview in ${formatDecimal(overviewDuration)}s`;

  //     yield { type: "completed", statusText, data: finalSearch };
  //     return finalSearch; // The final value returned by the generator
  //   } catch (error) {
  //     const errorMessage = "An unexpected error occurred during spyglass run";
  //     logger.error(errorMessage, { userId, error });
  //     yield {
  //       type: "error",
  //       data: errorMessage,
  //       statusText: "Something went wrong...",
  //     };
  //     return undefined;
  //   }
  // }

  // public static async *runSpyglassGenerator(
  //   userId: string | RecordId,
  //   spyglassId: string | RecordId,
  // ): AsyncGenerator<
  //   {
  //     type: ISpyglassGeneratorType;
  //     statusText: string;
  //     data: ISpyglassSearch | string;
  //   },
  //   ISpyglassSearch | undefined, // The final return type of the generator
  //   unknown
  // > {
  //   const startTime = Date.now();
  //   let resultsTime: number | null = null;
  //   let findingsTime: number | null = null;
  //   let overviewTime: number | null = null;

  //   try {
  //     // --- Phase 1: Initial Setup ---
  //     const db = await getDatabase();
  //     if (!db) {
  //       throw new Error("Database not initialized");
  //     }

  //     const getSpyglass = async () => SpyglassSearch.get(spyglassId);
  //     let spyglass = await getSpyglass();

  //     if (!spyglass) {
  //       throw new Error("Search not found");
  //     }

  //     if (!spyglass.intent) {
  //       console.info("Loading Spyglass intent...");
  //       await SpyglassSearch.loadIntent(userId, spyglass.id);
  //       spyglass = await getSpyglass();
  //       if (!spyglass)
  //         throw new Error("Spyglass record disappeared after loading intent.");
  //       yield {
  //         type: "intent_loaded",
  //         statusText: "Understanding intent...",
  //         data: spyglass,
  //       };
  //     }

  //     if (!spyglass.results || spyglass.results.length === 0) {
  //       console.info("Loading Spyglass results...");
  //       await SpyglassSearch.loadResults(userId, spyglass.id);
  //       spyglass = await getSpyglass();
  //       if (!spyglass)
  //         throw new Error("Spyglass record disappeared after loading results.");
  //       resultsTime = Date.now();
  //       yield {
  //         type: "results_loaded",
  //         statusText: `Found ${spyglass.results?.length || 0} results...`,
  //         data: spyglass,
  //       };
  //     }

  //     if (!resultsTime) resultsTime = Date.now();

  //     if (
  //       !spyglass.analysis?.findings ||
  //       spyglass.analysis.findings.length === 0
  //     ) {
  //       console.info("Generating Spyglass findings...");
  //       if (!spyglass.intent) throw new Error("Spyglass intent was not found.");

  //       yield {
  //         type: "findings_generating",
  //         statusText: "Analyzing sources...",
  //         data: spyglass,
  //       };

  //       const completeFindings: IFinding[] = [];
  //       for await (const findingsArray of Spyglass.generateFindingsFromResources(
  //         spyglass.baseQuery,
  //         spyglass.fullResults || [],
  //         spyglass.intent,
  //       )) {
  //         completeFindings.push(...findingsArray);
  //         yield {
  //           type: "findings_chunk",
  //           statusText: `Generated ${completeFindings.length} findings...`,
  //           data: JSON.stringify(findingsArray),
  //         };

  //         if (completeFindings.length > max_spyglass_finding_amount) {
  //           logger.warn(
  //             "Exceeded maximum finding amount. Stopping generation.",
  //           );
  //           break;
  //         }
  //       }

  //       await db.merge<ISpyglassSearch>(spyglass.id, {
  //         analysis: { findings: completeFindings, overview: "" },
  //       });

  //       spyglass = await getSpyglass();
  //       if (!spyglass)
  //         throw new Error("Spyglass record disappeared after saving findings.");

  //       findingsTime = Date.now();
  //       yield {
  //         type: "findings_loaded",
  //         statusText: `Analyzed ${spyglass.results?.length || 0} sources.`,
  //         data: spyglass,
  //       };
  //     }

  //     // Ensure findingsTime is set if they were already loaded
  //     if (!findingsTime) findingsTime = Date.now();

  //     // --- Phase 4: Stream Overview Generation ---
  //     if (spyglass.analysis?.findings && !spyglass.analysis.overview) {
  //       console.info("Loading Spyglass overview...");
  //       if (!spyglass.intent)
  //         throw new Error("Intent not found for overview generation.");

  //       yield {
  //         type: "overview_generating",
  //         statusText: "Composing answer...",
  //         data: spyglass,
  //       };

  //       let completeOverview = "";
  //       for await (const chunk of Spyglass.generateOverviewFromFindings(
  //         spyglass.baseQuery,
  //         spyglass.analysis.findings,
  //         spyglass.intent,
  //         spyglass.fullResults || [],
  //         spyglass.parent,
  //       )) {
  //         completeOverview += chunk;
  //         yield {
  //           type: "overview_chunk",
  //           statusText: "Composing answer...",
  //           data: chunk,
  //         };
  //       }

  //       // Save the complete overview
  //       await db.merge<ISpyglassSearch>(spyglass.id, {
  //         analysis: { ...spyglass.analysis, overview: completeOverview },
  //       });

  //       spyglass = await getSpyglass();
  //       if (!spyglass)
  //         throw new Error("Spyglass record disappeared after saving overview.");

  //       overviewTime = Date.now();
  //       yield {
  //         type: "overview_completed",
  //         statusText: "Answer complete.",
  //         data: spyglass,
  //       };
  //     }

  //     // --- Phase 5: Completion ---
  //     const finalSearch = spyglass;
  //     const resultsDuration = resultsTime
  //       ? (resultsTime - startTime) / 1000
  //       : null;
  //     const findingsDuration =
  //       findingsTime && resultsTime
  //         ? (findingsTime - resultsTime) / 1000
  //         : null;
  //     const overviewDuration =
  //       overviewTime && findingsTime
  //         ? (overviewTime - findingsTime) / 1000
  //         : null;

  //     const formatDecimal = (value: number | null) =>
  //       value?.toFixed(2) ?? "N/A";
  //     const totalCitations = finalSearch.analysis?.findings.length ?? 0;

  //     const statusText = `Found ${finalSearch.results?.length ?? 0} result${
  //       finalSearch.results?.length === 1 ? "" : "s"
  //     } in ${formatDecimal(resultsDuration)}s. Generated ${totalCitations} findings in ${formatDecimal(
  //       findingsDuration,
  //     )}s and overview in ${formatDecimal(overviewDuration)}s`;

  //     yield { type: "completed", statusText, data: finalSearch };
  //     return finalSearch;
  //   } catch (error: any) {
  //     const errorMessage =
  //       error.message || "An unexpected error occurred during spyglass run";
  //     logger.error(errorMessage, { userId, spyglassId, error });
  //     yield {
  //       type: "error",
  //       data: errorMessage,
  //       statusText: "Something went wrong...",
  //     };
  //     return undefined;
  //   }
  // }
}
