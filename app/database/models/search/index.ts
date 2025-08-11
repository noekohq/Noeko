import { RecordId, StringRecordId } from "surrealdb";
import {
  ISearchOverview,
  ISearchResult,
  ISearchResultValue,
} from "../../../services/Search";
import { logger } from "../../../services/Logger";
import { getDatabase } from "../../db";
import { parseIncompleteJsonArray } from "../../../utils/processing";
import { max_spyglass_finding_amount } from "../../../settings";
import Spyglass, {
  ISpyglassIntent,
  ISpyglassScopeOption,
} from "../../../services/Spyglass";
import { IRabbithole } from "../rabbithole";
import { IWebSearch, IWebSearchResult, WebSearch } from "./web_search";

export type ISpyglassSearch = {
  id: string | RecordId;
  baseQuery: string;
  intent?: ISpyglassIntent;
  analysis: ISearchOverview | null;
  results?: ISearchResultValue[];
  resultConnections?: ISearchConnection[];
  fullResults?: ISearchResult[];
  webSearches?: IWebSearch[];
  parent?: ISpyglassSearch;
  rabbithole?: IRabbithole;
  scope: ISpyglassScopeOption;
  createdAt: Date;
  updatedAt: Date;
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

export type IWebConnection = {
  in: string | RecordId;
  out: string | RecordId;
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
              (SELECT * OMIT embeddings FROM ->found->idea) as results,
              (SELECT * OMIT embeddings FROM ->is_source_for->web_search->found->web_result) as webResults,
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
                (SELECT * OMIT embeddings FROM ->found->idea) as results,
                (SELECT * OMIT embeddings FROM ->is_source_for->web_search->found->web_result) as webResults,
                (SELECT * FROM ->is_followup_to->spyglass)[0] AS parent,
                (SELECT * FROM <-includes<-rabbithole)[0] AS rabbithole
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
    options?: {
      rabbitholeId?: string;
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
          scope: form.scope,
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
      const intent = await Spyglass.getIntentFromQuery(search);
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
      const webSearches: IWebSearch[] = [];
      if (search.intent) {
        console.log("Loading for scope: ", search.scope);
        switch (search.scope) {
          case "all":
          case "my-qwest":
            console.log("Getting queries from ", search.intent.queries);
            const r = await Spyglass.getResultsFromQueries(
              userId.toString(),
              search.intent.queries,
              {
                rabbitholeId: search.rabbithole?.id.toString(),
              },
            );
            results.push(...r);
            break;
          case "web":
            console.log("Loading search many...");
            const webR = await WebSearch.searchMany(search.intent.queries);
            console.log("Loaded search many...", webR);
            if (!webR) {
              return;
            }
            webR.forEach((ws) => {
              if (ws) {
                webSearches.push(ws);
              }
            });
            break;
        }
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
      const webRelationQueries = webSearches.map(async (webSearch) => {
        const fromId = new StringRecordId(search.id);
        const toId = new StringRecordId(webSearch.id);
        return db.query<[IWebConnection]>(
          `RELATE $fromId->is_source_for->$toId CONTENT { createdAt: $now };`,
          {
            fromId: fromId,
            toId: toId,
            now: new Date(),
          },
        );
      });
      await Promise.all(relationQueries);
      await Promise.all(webRelationQueries);
      return search;
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
}
