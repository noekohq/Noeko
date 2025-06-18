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
import { htmlToMarkdown } from "../../utils/formatting";
import { getLM, PromptBuilder } from "../../semantics/lm";
import { getFormattedDateTimeToday } from "../../utils/prompts/components";
import { max_lm_prompt_size } from "../../settings";
import { SchemaType } from "@google/generative-ai";

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
  | "analysis_loaded";

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
              ->found->idea as results
            FROM ONLY <record> $spyglassRecord
            FETCH results;
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
      const analysis = await SpyglassSearch.getSpyglassOverviewFromResults(
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
    let analysisTime: number | null = null;

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

      if (
        !spyglass.analysis ||
        (!spyglass.analysis.findings.length &&
          spyglass.results &&
          spyglass.results.length > 0)
      ) {
        try {
          await SpyglassSearch.loadAnalysis(userId, spyglass.id);
          spyglass = await SpyglassSearch.get(spyglass.id);
          if (!spyglass) {
            throw new Error("Spyglass not found");
          }
          yield {
            type: "analysis_loaded",
            statusText: `Read ${spyglass.results?.length || "some"} results...`,
            data: spyglass,
          };
        } catch (e) {
          const errorMessage = "Error loading analysis";
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
        analysisTime = Date.now();
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
      const analysisDuration =
        analysisTime && resultsTime
          ? (analysisTime - resultsTime) / 1000
          : null;

      const formatDecimal = (value: number | null) =>
        value?.toFixed(2) ?? "N/A";

      const totalCitations = finalSearch.analysis?.findings.length;

      const statusText = `Found ${finalSearch.results?.length ?? 0} result${finalSearch.results?.length === 1 ? "" : "s"} in ${formatDecimal(resultsDuration)}s. Analyzed ${totalCitations} references in ${formatDecimal(analysisDuration)}s`;

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

  static async getSpyglassOverviewFromResults(
    query: string,
    results: ISearchResult[],
  ): Promise<ISearchOverview | undefined> {
    try {
      if (results.length === 0) {
        return {
          findings: [],
          overview: "There were no results to analyze.",
        };
      }
      const resultsStrings = results.map((result) => {
        let r = "";
        const { highlightText, value } = result;
        const ideaValue = value as IIdea;
        r += `**${ideaValue.title}**\n`;
        r += `Source ID: <${ideaValue.id.toString()}>\n`;
        if (highlightText) {
          r += `System Highlighted Text: ${highlightText}`;
        }
        r += `${htmlToMarkdown(ideaValue.content)}`;
        return r;
      });
      const overviewPrompt = new PromptBuilder()
        .addText("You are a search overview creator.")
        .addBlock(
          "Instructions",
          `Generate a comprehensive and informative answer to the user's query, based entirely on the results provided. You will generate the answer in two parts:
          1. Findings: a list of individual findings from the results, along with the result referenced, and relevant excerpt. It is EXTREMELY important that this stage be entirely based on the results provided, with your analysis being derived directly from relevant excerpts from the result.
          2. Overview: once your findings are complete, you will generate a brief, direct answer to the user's query, based entirely on the results of your findings. This doesn't need to have references, and will essentially tie your generation up in a neat bow.`,
        )
        .addBlock("Results", "The results to use are as follows:\n");

      resultsStrings.forEach((s, i) => {
        // make sure we don't surpass lm prompt size
        const totalSize = overviewPrompt.get().length;
        if (totalSize + s.length > max_lm_prompt_size) {
          return;
        }
        overviewPrompt.addBlock(`Result ${i + 1}`, s, 2);
      });

      overviewPrompt
        .addBlock(
          "Query",
          `The user's query is as follows:
          > ${query}`,
        )
        .addBlock("Context", `It is currently ${getFormattedDateTimeToday()}.`)
        .addBlock(
          "Please Remember!",
          `
        - Is is of the upmost importance that findings be directly sourced from the results
        - The overview, on the other hand, should rely on findings, but ultimately favor answering the query
        - If you do not know something from the results, don't be afraid to say you don't know.
        - Format **the overview** as Markdown, tags are allowed, this can be formatted in accordance with the user query
          `,
        );

      const lm = getLM().withModel("simple");
      const result = await lm.generateJSON<ISearchOverview>(
        overviewPrompt.get(),
        {
          type: SchemaType.OBJECT,
          properties: {
            findings: {
              type: SchemaType.ARRAY,
              description: "Your findings directly from the source results",
              items: {
                type: SchemaType.OBJECT,
                description: "An individual finding from the source results",
                properties: {
                  sourceId: {
                    type: SchemaType.STRING,
                    description:
                      "The id of the result you're sourcing, formatted as <[ACTUAL ID HERE]>.",
                  },
                  excerpt: {
                    type: SchemaType.STRING,
                    description: "The relevant portion of the source result",
                  },
                  analysis: {
                    type: SchemaType.STRING,
                    description:
                      "Your finding from this excerpt, how it relates to the query",
                  },
                },
                required: ["sourceId", "excerpt", "analysis"],
              },
            },
            overview: {
              type: SchemaType.STRING,
              description:
                "A direct response to the user's query based on the findings.",
            },
          },
          required: ["findings", "overview"],
        },
      );
      if (!result) {
        throw new Error("overview not generated by LM");
      }
      return result;
    } catch (error) {
      console.error("Error getting overview from results:", error);
      return undefined;
    }
  }
}
