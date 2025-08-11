import { getLM } from "../ai/lms/lm";
import { LMSchema, LMSchemaType } from "../ai/lms";
import { PromptBuilder } from "../ai/lms/utils";
import { ISearchOverview, ISearchResult, Search } from "./Search";
import { IIdea } from "../database/models/ideas";
import { formatDate, htmlToMarkdown } from "../utils/formatting";
import { max_lm_prompt_size, max_spyglass_finding_amount } from "../settings";
import { getFormattedDateTimeToday } from "../utils/prompts/components";
import {
  ISpyglassGeneratorType,
  ISpyglassSearch,
  SpyglassSearch,
} from "../database/models/search";
import {
  IWebSearchResult,
  WebSearch,
} from "../database/models/search/web_search";
import { RecordId } from "surrealdb";
import { getDatabase } from "../database/db";
import { logger, LoggingService } from "./Logger";
import { parseIncompleteJsonArray } from "../utils/processing";
import WebSearchService from "./WebSearch";

export type ISpyglassScopeOption = "web" | "my-qwest" | "all";

type ICitationMap = Record<
  string,
  | {
      type: "web";
      value: IWebSearchResult;
    }
  | {
      type: "internal";
      value: ISearchResult;
    }
>;

interface ISpyglassMode {
  intent: {
    bestFor: string;
    examples: string[];
  };
  analysis: {
    description: string;
    prompt: (query: string) => PromptBuilder;
  };
  response: {
    description: string;
    prompt: (query: string) => PromptBuilder;
  };
}

export const Modes: Record<string, ISpyglassMode> = {
  briefAnswer: {
    intent: {
      bestFor: `Simple, factual queries, definition requests, and other Q&A type questions where the user wants a specific, short answer.`,
      examples: [
        "who/what/when/where/why/how is <noun/fact/place>",
        "do I have a note about <thing>",
      ],
    },
    response: {
      description:
        "A single, direct paragraph that concisely answers the user's query.",
      prompt: () =>
        new PromptBuilder().addBlock(
          "Instructions",
          `
          Directly answer the user's query in a single, concise paragraph.
          If the necessary information is not available, state that.

          **DO NOT** write more than one paragraph.
          `,
        ),
    },
    analysis: {
      description:
        "Extracts the single most critical piece of information needed to directly answer the query.",
      prompt: () =>
        new PromptBuilder().addBlock(
          "Instructions",
          `
          Identify the essential facts from the source material required to answer the query.
          Extract only the minimum information needed.
          Ignore irrelevant details and information already present in the query.
          `,
        ),
    },
  },
  simpleList: {
    intent: {
      bestFor:
        "Queries that are likely to return many items, none of which need significant elaboration.",
      examples: [
        "What are all of my todos?",
        "What are my notes on <thing>",
        "List all the types of <item>",
      ],
    },
    response: {
      description:
        "A simple bulleted or numbered list of items, followed by a one-paragraph summary.",
      prompt: () =>
        new PromptBuilder().addBlock(
          "Instructions",
          `
          Generate a list of the identified items using Markdown.
          - Use a bulleted list (\`-\` or \`*\`). If the items have a natural order, use a numbered list (\`1.\`).
          - If categories are present, use bold text (\`**Category**\`) for category titles.
          - Conclude with a single, brief summary paragraph.
          `,
        ),
    },
    analysis: {
      description:
        "Identifies all individual items for a list and extracts key details for a brief summary.",
      prompt: () =>
        new PromptBuilder().addBlock(
          "Instructions",
          `
          Extract all items that should be in the list. For each item, pull out its name or a brief identifier.
          Separately, gather key points that can be used to summarize the overall theme of the list.
          Ensure no duplicate items are extracted.
          `,
        ),
    },
  },
  detailedList: {
    intent: {
      bestFor:
        "Queries where the user likely wants fewer, more detailed options, often with categorization.",
      examples: [
        "What are some strategies for <action>?",
        "What should I consider when choosing <item>?",
      ],
    },
    response: {
      description:
        "A list where each item is a heading with a detailed paragraph, framed by an introduction and conclusion.",
      prompt: () =>
        new PromptBuilder().addBlock(
          "Instructions",
          `
          Follow this structure precisely:
          1.  **Introduction**: Write a brief introductory paragraph.
          2.  **List Items**: For each item, create a Markdown heading (e.g., \`## Item Title\`). Under each heading, write a single, detailed descriptive paragraph.
          3.  **Conclusion**: Conclude with a brief summary paragraph.
          `,
        ),
    },
    analysis: {
      description:
        "Groups extracted information into distinct topics, pulling a title and detailed description for each, plus key points for an introduction and summary.",
      prompt: () =>
        new PromptBuilder().addBlock(
          "Instructions",
          `
          Identify the main topics from the source material.
          For each topic, extract a title and a paragraph of detailed, relevant information.
          Filter out irrelevant or secondary details.
          Group the extracted information by topic.
          `,
        ),
    },
  },
  breakdown: {
    intent: {
      bestFor:
        "Broad queries where the user wants to understand a complex concept, learn a process, or follow a tutorial.",
      examples: [
        "What is the history of the internet?",
        "How does DNS work?",
        "Explain the steps for making sourdough bread from my notes.",
      ],
    },
    response: {
      description:
        "An explanatory article that introduces a topic, details its key components in separate sections, and concludes with a summary.",
      prompt: () =>
        new PromptBuilder().addBlock(
          "Instructions",
          `
          Compose an article or guide explaining the topic. Follow this structure:
          1.  **Introduction**: A paragraph providing a high-level overview.
          2.  **Body**:
              - For conceptual topics, use multiple sections with clear Markdown headings (\`##\`) that break down the core concepts.
              - For processes or steps, use a numbered list (\`1.\`, \`2.\`, etc.) with detailed list items for each step.
          3.  **Conclusion**: A summary paragraph.
          `,
        ),
    },
    analysis: {
      description:
        "Extracts comprehensive, multi-faceted information on a topic, suitable for constructing a detailed explanatory article.",
      prompt: () =>
        new PromptBuilder().addBlock(
          "Instructions",
          `
          From the source material, extract all key facts, concepts, historical points, and explanations related to the user's query.
          Organize the findings into logical themes suitable for essay sections.
          Adhere strictly to the provided information.
          `,
        ),
    },
  },
  comparitiveAnalysis: {
    intent: {
      bestFor:
        "Queries where the user wants to compare and contrast two or more items.",
      examples: [
        "Compare and contrast <thing1> and <thing2>",
        "What is the difference between <thing1> and <thing2>",
      ],
    },
    response: {
      description:
        "A detailed comparison of two or more items, highlighting similarities and differences, presented in an HTML table.",
      prompt: () =>
        new PromptBuilder().addBlock(
          "Instructions",
          `
          1.  Write a brief introductory paragraph.
          2.  Generate a Markdown \`<table>\` to compare the items.
              - The first row should be table headers for 'Feature' and each item being compared.
              - Subsequent rows should have the feature in the first column and the corresponding details for each item in the following columns.
          3.  Conclude with a summary paragraph.
          `,
        ),
    },
    analysis: {
      description:
        "Extracts comparable features and specific details for two or more items to populate a comparison table.",
      prompt: () =>
        new PromptBuilder().addBlock(
          "Instructions",
          `
          Identify the key items for comparison from the query.
          From the source material, extract a list of common features or points of comparison (e.g., cost, function, pros, cons).
          Then, for each item, find the specific details corresponding to each of those features.
          Structure the output by item, listing its features and the corresponding details.
          `,
        ),
    },
  },
  proConAnalysis: {
    intent: {
      bestFor:
        "Queries asking for the advantages and disadvantages of a single subject.",
      examples: [
        "What are the pros and cons of using TypeScript?",
        "Should I move to a new city? Lay out the good and the bad.",
      ],
    },
    response: {
      description:
        "A two-column HTML table laying out the pros and cons of a subject.",
      prompt: () =>
        new PromptBuilder().addBlock(
          "Instructions",
          `
          1.  Write a brief introductory paragraph.
          2.  Generate a two-column Markdown \`<table>\`. The headers should be "Pros" and "Cons".
          3.  Populate each column with the relevant points. Use bulleted lists within cells if needed for readability.
          4.  Conclude with a summary paragraph.
          `,
        ),
    },
    analysis: {
      description: "Extracts all pros and cons related to a query.",
      prompt: () =>
        new PromptBuilder().addBlock(
          "Instructions",
          `
          From the source material, extract all statements that represent an advantage, benefit, or positive aspect (Pro) and all statements that represent a disadvantage, risk, or negative aspect (Con) related to the user's query. Group them accordingly.
          `,
        ),
    },
  },
  timeline: {
    intent: {
      bestFor:
        "Queries about the history or chronological progression of a topic.",
      examples: [
        "Give me the history of my 'Project X' notes.",
        "What is the timeline of the development of the internet?",
      ],
    },
    response: {
      description:
        "A chronological list of events with dates and descriptions.",
      prompt: () =>
        new PromptBuilder().addBlock(
          "Instructions",
          `
          1.  Start with a brief introductory paragraph.
          2.  Generate a Markdown bulleted list (\`-\` or \`*\`) representing the timeline.
          3.  For each event, create a list item. Use bold text (\`**Date/Time**\`) for the date/time period followed by the event description.
          4.  End with a concluding summary paragraph.
          `,
        ),
    },
    analysis: {
      description: "Extracts dated or sequential events to build a timeline.",
      prompt: () =>
        new PromptBuilder().addBlock(
          "Instructions",
          `
          Extract all events, dates, and key milestones from the source material. For each event, capture the date or time period and a concise description of what happened. Ensure the events are ordered chronologically.
          `,
        ),
    },
  },
  quickFind: {
    intent: {
      bestFor: "When the user is trying to find a specific resource quickly",
      examples: [
        "Do I have any notes on <topic>",
        "What is my idea about <thing>",
      ],
    },
    analysis: {
      description:
        "Quickly scans for relevant information, skipping anything that doesn't directly match the intent",
      prompt: (query) =>
        new PromptBuilder().addBlock(
          "Instructions",
          `
          Your job is to find and extract only the most directly relevant information.
          You should prioritize speed and efficiency, only including most useful information in your analysis.
          The goal is to comprehensively but succinctly analyze results in accordance with the user's intent.
          `,
        ),
    },
    response: {
      description:
        "Outputs a quick result, giving the user a concise response with the information found.",
      prompt: (query) =>
        new PromptBuilder()
          .addBlock(
            "Instructions",
            `
            Output a brief response directly to the user's query based on the analysis provided.
            **DO** provide the user with a direct and relevant answer to their query.
            **DO NOT** include unnecessary details or information that is not directly relevant to the user's query.
            `,
          )
          .addBlock("User Query", query ?? "No query provided."),
    },
  },
  specifiedFormat: {
    intent: {
      bestFor:
        "Queries where the user explicitly specifies how they want the response formatted.",
      examples: [
        "Give me a table of my best ideas",
        "A short paragraph explaining my app",
        "Summarize my notes on networking as a JSON object",
      ],
    },
    response: {
      description:
        "Formats the response exactly as specified by the user in their query (e.g., 'as a table', 'a single paragraph', 'a JSON object').",
      prompt: (query) =>
        new PromptBuilder()
          .addBlock(
            "Instructions",
            `
            The user has specified a desired format for the response in their query.
            Your primary goal is to adhere to this specified format.

            1.  Analyze the user's query below to identify the requested format (e.g., table, list, JSON, paragraph).
            2.  Use the information from the analysis to construct the response, strictly following the user's formatting instructions.
            `,
          )
          .addBlock("User Query", query ?? "No query provided."),
    },
    analysis: {
      description:
        "A flexible analysis that extracts both the user's desired output format and the content required to populate that format.",
      prompt: (query) =>
        new PromptBuilder()
          .addBlock(
            "Instructions",
            `
            Your task is two-fold:
            1.  **Identify Format**: Carefully read the user's query and state the specific output format they have requested (e.g., 'JSON object', 'HTML table', 'single paragraph').
            2.  **Extract Content**: From the source material, extract all key information, facts, and data points necessary to populate the format you identified in step 1.

            Provide the identified format and the extracted content as separate, clearly-labeled pieces of information.
            `,
          )
          .addBlock("User Query", query ?? "No query provided."),
    },
  },
};

export interface ISpyglassIntent {
  intent: string;
  queries: string[];
  mode: keyof typeof Modes;
}

export type IFindingType =
  // FOUNDATIONAL
  | "FACT"
  | "CONTRADICTION"
  | "DEFINITION"
  // DIRECT ANSWER TYPES
  | "EXPLANATION"
  | "EXAMPLE"
  | "PROCEDURE"
  // PERSONAL & REFLECTIVE
  | "PERSONAL_INSIGHT"
  | "TAKEAWAY"
  | "OPEN_QUESTION"
  | "ACTION_ITEM"
  | "KNOWLEDGE_GAP"
  // STRUCTURAL AND REFERENCE TYPES
  | "REFERENCE"
  | "QUOTE"
  | "COMPARISON";

export const FindingTypes = [
  "FACT",
  "CONTRADICTION",
  "DEFINITION",
  "EXPLANATION",
  "EXAMPLE",
  "PROCEDURE",
  "PERSONAL_INSIGHT",
  "TAKEAWAY",
  "OPEN_QUESTION",
  "ACTION_ITEM",
  "REFERENCE",
  "QUOTE",
  "COMPARISON",
] as IFindingType[];

export type IFinding = {
  excerpt: string;
  sourceId: string;
  analysis: string;
  findingType: IFindingType;
};

const spyglassMissionStatement = `
  To answer the user's query with the best possible answer, embodying the following principles:
  1. Accuracy: our answers only include information that is supported by our sources.
  2. Clarity: our answers are clear and easy to understand.
  3. Completeness: our answers are comprehensive and directly cover all relevant aspects of the user's query.
  4. Journalistic Integrity: our answers are unbiased and truthful, and we **ALWAYS** cite our sources.
`;

type IProcessedResult = {
  id: string;
  prompt: string;
};

export default class Spyglass {
  constructor() {}

  public static async *runSpyglassGenerator(
    userId: string | RecordId,
    spyglassId: string | RecordId,
  ): AsyncGenerator<
    {
      type: ISpyglassGeneratorType;
      statusText: string;
      data: ISpyglassSearch | string;
    },
    ISpyglassSearch | undefined,
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
      console.log("Got initial spyglass: ", spyglass);
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

      if (!spyglass.intent) {
        try {
          await SpyglassSearch.loadIntent(userId, spyglass.id);
          spyglass = await getSpyglass();
          if (!spyglass) {
            throw new Error("Spyglass not found");
          }
          yield {
            type: "intent_loaded",
            statusText: "Loading results...",
            data: spyglass,
          };
        } catch (e) {
          const errorMessage = "Error loading intent";
          logger.error(errorMessage, {
            userId,
            searchId: spyglassId,
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
        console.log("Loaded spyglass results web: ", spyglass.webSearches);
        const scope = spyglass.scope;
        if (["all", "my-qwest"].includes(scope)) {
          if (!spyglass.fullResults) {
            throw new Error("Did not load full results");
          }
        }
        if (["all", "web"].includes(scope)) {
          if (!spyglass.webSearches) {
            throw new Error("Did not load web results");
          }
        }
        if (!spyglass.intent) {
          throw new Error("Spyglass intent not found");
        }

        yield {
          type: "findings_generating",
          statusText: "Generating findings...",
          data: spyglass,
        };

        let completeFindingsJSON = "";
        for await (const findingChunk of Spyglass.generateFindingsFromResults(
          spyglass,
        )) {
          completeFindingsJSON += findingChunk;
          yield {
            type: "findings_chunk",
            statusText: "Generating findings...",
            data: findingChunk,
          };
          const completeFindings =
            parseIncompleteJsonArray(completeFindingsJSON);
          if (completeFindings.length > max_spyglass_finding_amount) {
            throw new Error("Too many findings");
          }
        }

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
      if (
        spyglass.intent &&
        spyglass.analysis &&
        spyglass.analysis.findings.length > 0
      ) {
        try {
          yield {
            type: "overview_generating",
            statusText: "Generating overview...",
            data: spyglass,
          };

          let completeOverview = "";
          for await (const chunk of Spyglass.generateOverviewFromFindings(
            spyglass,
          )) {
            completeOverview += chunk;
            yield {
              type: "overview_chunk",
              statusText: "Generating overview...",
              data: chunk,
            };
          }

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

  static async getResults(
    userId: string,
    query: string,
    options?: {
      rabbitholeId?: string;
    },
  ) {
    return await Search.comprehensiveSearch(userId, query, options);
  }

  static async getResultsFromQueries(
    userId: string,
    queries: string[],
    options?: {
      rabbitholeId?: string;
    },
  ): Promise<ISearchResult[]> {
    const searchPromises = queries.map((query) =>
      Search.comprehensiveSearch(userId, query, {
        rabbitholeId: options?.rabbitholeId,
      }),
    );

    const allResultSets = await Promise.all(searchPromises);

    const resultsExisting = new Set<string>();
    const allResults: ISearchResult[] = [];

    for (const resultSet of allResultSets) {
      if (resultSet) {
        for (const result of resultSet) {
          const resultId = result.id.toString();
          if (!resultsExisting.has(resultId)) {
            resultsExisting.add(resultId);
            allResults.push(result);
          }
        }
      }
    }

    return allResults;
  }

  static getCitationMap(results: {
    internalResults?: ISearchResult[];
    webResults?: IWebSearchResult[];
  }): ICitationMap {
    const citationMap: ICitationMap = {};
    results.internalResults?.map((result) => {
      citationMap[result.id.toString()] = {
        type: "internal",
        value: result,
      };
    });
    results.webResults?.map((webResult) => {
      citationMap[webResult.id.toString()] = {
        type: "web",
        value: webResult,
      };
    });
    return citationMap;
  }

  static intentPromptBuilder(spyglass: ISpyglassSearch) {
    const builder = new PromptBuilder()
      .addText(
        "You are an intelligent user query parser called Spyglass Q, responsible for understanding the user's intent, and deciding how to respond.",
      )
      .addBlock(
        "Purpose and Goal",
        `
        Your purpose is to analyze the user's query, and contribute to a larger search pipeline by building the foundational understanding of the user's intent.
        `,
      )
      .addBlock(
        "Context",
        `
        It is currently ${getFormattedDateTimeToday()}.
        You are part of a search engine called Spyglass in an app called Qwest. The goal of the system is to provide a natural language answer to any user's search, with the entire answer based on provided search results.
        `,
      );

    switch (spyglass.scope) {
      case "all":
        builder.addBlock(
          "Scope",
          `The user has requested a scope that includes all data available to the search service, meaning it can contain their own notes and ideas, as well as sources from their files or the internet. You should therefore dispatch queries which will be run against the internet itself.`,
        );
        break;
      case "my-qwest":
        builder.addBlock(
          "Scope",
          `The user has requested a scope that includes only their own data available to the search service, meaning it can contain their own notes and ideas, but not sources from their files or the internet. You should therefore dispatch queries which will be run against their own notes.`,
        );
        break;
      case "web":
        builder.addBlock(
          "Scope",
          `The user has requested a scope that includes only sources from the internet. You should therefore dispatch queries which will be run against the internet itself.`,
        );
    }

    if (spyglass.parent && spyglass?.parent?.intent) {
      builder.addBlock(
        "Follow-Up Context",
        `
        Crucially, this is a follow-up to a previous query. Thus, your response should be based on the previous query and the user's intent.

        Keep the fact that this is a follow-up question in mind, as it should influence your sources and the way you approach the query.

        <previousQuery>
        ${spyglass.parent.baseQuery}
        </previousQuery>

        The user's intent was classified as:
        <previousIntent>
        ${spyglass.parent.intent.intent}
        </previousIntent>
      `,
      );
    }

    builder
      .addBlock("Mission Statement", spyglassMissionStatement)
      .addBlock(
        "Instructions",
        `
        1. Given the user's query, infer their intent. What is the goal, or intended purpose of this query?
        2. Given the user's intent, select a Spyglass Mode, which will optimize the entire system to best respond to the user's intent. This will include response format, as well as analysis configuration
        3. Based on the understood intent and selected Spyglass Mode, draft Search Queries that will fetch relevant notes from the system
        `,
      )
      .addBlock(
        "Spyglass Mode",
        `
        The Spyglass Mode is a way to tune the entire Spyglass pipeline towards the user's intent, to ensure the best possible answer to the user's query.

        Each mode tunes the following:
        - Analysis configuration: how the system finds relevant information from the queried search results
        - Response format: how that relevant information will be formatted into an answer to the user's initial query

        You should select a mode based on what it is best for, and the user's intent.

        The modes are as follows
        ${Object.entries(Modes).map(([id, mode]) => {
          return `
          <spyglassMode>
            <spyglassModeId>${id}</spyglassModeId>
            Best For: ${mode.intent.bestFor}
            Examples:
            ${mode.intent.examples.map((ex) => `- ${ex}\n`)}

            Analysis Configuration: ${mode.response.description}
            Response Format: ${mode.response.description}
          </spyglassMode>
          `;
        })}
        `,
      )
      .addBlock(
        "Search Queries",
        `
        # Search Queries

        - Your goal is to draft high-quality search queries to find the most relevant notes from the user's knowledge base.
        - The queries should be optimized to reflect the user's core intent.
        - Focus on quality over quantity. A few well-crafted queries are better than many broad ones.
        `,
      )
      // .addBlock(
      //   "Search Queries",
      //   `
      //   Search queries can utilize both semantic and FTS search, the system utilizes cosine similarity on embeddings vectors to offer semantic search, and uses an FTS search index with BM25 ranking, as well as Jaro Winkler string distance on titles.

      //   Given that information, you should build queries that are optimized to fetch relevant results to the user's intent. These queries can be short or long, and rich in intent or specifics.

      //   Optimize the queries heavily towards the user's intent, but don't go overboard.
      //   You are looking to cherry-pick the highest possible quality results from the user's knowledge-base.

      //   Search Queries will be used to search all of the information in the user's knowledge-base, and thus should be optimized to fetch relevant results to the user's intent.

      //   **DO NOT** write too many Search Queries, rather design for quality not quantity, but ultimately adhere to the user's intent.
      //   **DO** write extremely optimized queries designed to find the most relevant notes to the user's intent.
      //   `,
      // )
      .addBlock(
        "User Query",
        `
        The user's query is as follows:
        <userquery>
        ${spyglass.baseQuery}
        </userquery>
        `,
      );

    return builder;
  }

  static findingsPromptBuilder(spyglass: ISpyglassSearch, mode: ISpyglassMode) {
    return (
      new PromptBuilder()
        // This persona-setting is great. Keep it.
        .addText(
          "You are a data extraction and analysis engine called Spyglass Analyst. Your sole purpose is to extract relevant information from a given text based on a user intent.",
        )

        // The Context block is also excellent. Keep it.
        .addBlock(
          "Context",
          `
          Here is some context for you to use in formation of your analysis:
          <context>
            It is currently ${getFormattedDateTimeToday()}.
            You are part of a search engine called Spyglass in an app called Qwest. The goal of the system is to provide a natural language answer to any user's search, with the entire answer based on their own notes. This means that user queries are likely to be reflective and personal, as well as analytical.
          </context>
          `,
        )

        // Keep the Mission Statement if it adds unique value not covered elsewhere.
        .addBlock("Mission Statement", spyglassMissionStatement)

        // --- MODIFICATION START ---
        // We replace the "Purpose and Goal" and "Analyzing Results" blocks
        // with this single, comprehensive block.

        .addBlock(
          "Core Workflow and Strict Rules",
          `
          Your goal is to build a report of findings that are directly and positively relevant to the "User Intent". Your analysis is crucial and will be used by other systems, so precision is mandatory.

          Follow this workflow for EACH search result provided:

          **1. Evaluate Relevance:**
          Compare the result against the "User Intent". Make a simple, binary decision: Is this result directly relevant?

          **2. Execute Based on Decision:**
          * **If YES (the result is relevant):**
              * Create a finding. Extract the single, most relevant, continuous excerpt.
              * Write a concise analysis explaining *why* this excerpt is relevant to the intent.

          * **If NO (the result is irrelevant):**
              * You MUST discard this result silently and completely.
              * Produce NO output, NO analysis, and NO comment for this result.
              * IMMEDIATELY move on to the next result.

          **Universal Strict Rules:**
          - **Negative analysis is FORBIDDEN.** Never report that a result was irrelevant or that information was missing. Your final report must only contain positive, relevant findings.
          - **Adhere to the Source:** Your analysis MUST be based ONLY on the provided results. DO NOT add your own knowledge or infer information not explicitly present.
          - **Process Sequentially:** You MUST process results in the order they are given and never return to a previous result.
          `,
        )

        .addBlock(
          "User Intent",
          spyglass.intent?.intent ?? "No intent provided",
        )
        .addText(
          mode.analysis
            .prompt(spyglass.intent?.intent ?? "No intent provided")
            .get(),
        )
        .addBlock("Search Results", "The results to use are as follows:\n")
    );
  }

  static findingsSchema(sourceIds: string[]): LMSchema {
    return {
      type: LMSchemaType.ARRAY,
      description:
        "An array of structured findings extracted from the source results that are relevant to the user's intent.",
      items: {
        type: LMSchemaType.OBJECT,
        description:
          "A single, discrete finding that helps answer the user's intent.",
        properties: {
          sourceId: {
            type: LMSchemaType.STRING,
            description:
              "The unique ID of the source result from which the excerpt is taken.",
            enum: sourceIds,
            format: "enum",
          },
          excerpt: {
            type: LMSchemaType.STRING,
            description:
              "The verbatim, direct quote from the source text that supports the finding. This must not be altered or summarized.",
          },
          analysis: {
            type: LMSchemaType.STRING,
            description:
              "A brief, one-sentence explanation of *why* this excerpt is important and how it directly helps answer the user's intent.",
          },
          // --- Updated the enum with the new, more detailed taxonomy for qwest.
          findingType: {
            type: LMSchemaType.STRING,
            description:
              "Categorize the nature of the finding in relation to the intent, based on the nature of personal knowledge-bases.",
            enum: [...FindingTypes],
            format: "enum",
          },
        },
        required: ["sourceId", "excerpt", "analysis", "findingType"],
      },
    };
  }

  static overviewPromptBuilder(spyglass: ISpyglassSearch, mode: ISpyglassMode) {
    const builder = new PromptBuilder()
      .addText(
        "You are Spyglass, a helpful and comprehensive AI search assistant. Your goal is to provide an accurate, unbiased, and expertly written answer to the user's query by synthesizing the provided findings.",
      )
      .addBlock(
        "Context",
        `
          It is currently ${getFormattedDateTimeToday()}.
          You are part of a search engine called Spyglass in an app called Qwest. The goal of the system is to provide a natural language answer to any user's search, with the entire answer based on the provided results. This means that user queries are likely to be reflective and personal, as well as analytical.
          `,
      );

    if (spyglass.parent) {
      let parentContext = `
      Crucially, this question is a follow-up to a previous query.
      The response should flow from the previous query and response.
      Previous Query:
      <previousQuery>
        ${spyglass.parent?.baseQuery}
      </previousQuery>

      `;

      if (
        spyglass.parent.analysis?.findings &&
        spyglass.parent.analysis.findings.length > 0
      ) {
        const findingsText = spyglass.parent.analysis?.findings
          .map((f, i) => `* Finding ${i + 1}: ${f.analysis}`)
          .join("\n");
        parentContext += `\n\nHere are the findings from the previous query:\n${findingsText}`;
      }

      if (spyglass.parent.analysis) {
        parentContext += `
        And here was the final response based on those findings:
        <previousResponse>
          ${spyglass.parent.analysis?.overview}
        </previousResponse>
        `;
      }
      builder.addBlock("Follow-Up Context", parentContext);
    }

    builder
      .addBlock("Mission Statement", spyglassMissionStatement)
      .addText(mode.response.prompt(spyglass.baseQuery).get())
      .addBlock(
        "Output and Citation Rules",
        `
          - Your entire response MUST be valid Markdown.
          - At the end of any sentence that uses information from the findings, you MUST add a citation.
          - Place the citation immediately after the last word of the sentence, with no space.
          - The format is a single, 1-based finding number inside brackets, like \`[1]\`.
          - If multiple findings support a sentence, list each citation in its own separate brackets, like \`[1][2]\`.

          ## Example:
          "Qwest is a knowledge management application designed to provide natural language answers from a user's notes[1]. Its core philosophy is to help users organize their thoughts and curate knowledge effectively[2][3]."
          `,
      )
      .addBlock(
        "Strict Rules",
        `
          - **ALWAYS** cite relevant findings for statements made to ensure accuracy and verifiability.
          - **ALWAYS** follow the specified formatting rules
          - **NEVER** use information that is not explicitly present in the Findings. If the Findings do not contain the answer, state that you cannot answer based on the information provided.
          - **NEVER** use moralizing or hedging language (e.g., "It is important to...", "It is subjective...").
          - **NEVER** refer to yourself as an AI, a model, or an assistant. Your name is Spyglass, but do not refer to yourself in the answer.
          - **NEVER** start your answer with a heading.
          `,
      )
      .addBlock(
        "User Query",
        `
        The user's query is:
        <userQuery>
          ${spyglass.baseQuery}
        </userQuery>
        `,
      )
      .addBlock(
        "Findings",
        "The findings to use for your answer are as follows:\n",
      );
    return builder;
  }

  static intentSchema(): LMSchema {
    return {
      type: LMSchemaType.OBJECT,
      properties: {
        intent: {
          type: LMSchemaType.STRING,
          description: "The intent of the user's query.",
        },
        mode: {
          type: LMSchemaType.STRING,
          description: "The spyglassModeId of the mode to use",
          enum: [...Object.keys(Modes)],
          format: "enum",
        },
        queries: {
          type: LMSchemaType.ARRAY,
          items: {
            type: LMSchemaType.STRING,
            description:
              "A search query related to the user's intent to fetch results.",
          },
          description: "The search queries related to the user's intent.",
        },
      },
      required: ["intent", "mode", "queries"],
    };
  }

  static async getIntentFromQuery(
    spyglass: ISpyglassSearch,
  ): Promise<ISpyglassIntent | undefined> {
    try {
      if (!spyglass.baseQuery.length) {
        return undefined;
      }
      const lm = getLM().withModel("simple");
      const prompt = this.intentPromptBuilder(spyglass).get();
      const intent = await lm.generateJSON<ISpyglassIntent>(
        prompt,
        this.intentSchema(),
      );
      if (!intent) {
        throw new Error("Did not get intent from LM");
      }
      return intent;
    } catch (error) {
      console.error("Error in getIntentFromQuery:", error);
      return undefined;
    }
  }

  static resultToString(result: ISearchResult) {
    let r = "";
    const { highlightText, value } = result;
    const ideaValue = value as IIdea;
    r += "<ideaResult>";
    r += ` <title>${ideaValue.title}</title>`;
    r += ` <id>${ideaValue.id}</id>`;
    if (highlightText) {
      r += `  <systemHighlightedText>${highlightText}</systemHighlightedText>`;
    }
    r += `  <content>${htmlToMarkdown(ideaValue.content)}</content>`;
    r += "</ideaResult>";
    return r;
  }

  static async webResultToString(result: IWebSearchResult) {
    let r = "";
    const item = result?.item;
    r += "<webResult>";
    r += ` <title>${item.title}</title>`;
    r += ` <link>${item.link}</link>`;
    if (item.snippet) {
      r += `  <systemHighlightedText>${item.snippet}</systemHighlightedText>`;
    }
    if (item.loaded.content) {
      r += `  <content>${htmlToMarkdown(item.loaded.content)}</content>`;
    } else {
      r += `  <content>No content loaded.</content>`;
    }
    r += "</webResult>";
    return r;
  }

  static processInternalResults(spyglass: ISpyglassSearch): IProcessedResult[] {
    const internalResults = spyglass.fullResults;
    const processedResults: IProcessedResult[] = [];
    for (const result of internalResults ?? []) {
      const prompt = this.resultToString(result) || "";
      if (!prompt) {
        continue;
      }
      processedResults.push({
        id: result.id.toString(),
        prompt,
      });
    }
    return processedResults;
  }

  static async processWebResults(
    spyglass: ISpyglassSearch,
  ): Promise<IProcessedResult[]> {
    try {
      const webSearches = spyglass.webSearches;
      const processedResults: IProcessedResult[] = [];
      for (const webSearch of webSearches ?? []) {
        const search = await WebSearch.get(webSearch.id);
        if (!search) {
          continue;
        }
        for (const result of search.results ?? []) {
          const prompt = (await this.webResultToString(result)) || "";
          if (!prompt) {
            continue;
          }
          processedResults.push({
            prompt,
            id: result.id.toString(),
          });
        }
      }
      return processedResults;
    } catch (error) {
      console.error("Error processing web results: ", error);
      return [];
    }
  }

  static async *generateFindingsFromResults(
    spyglass: ISpyglassSearch,
  ): AsyncGenerator<string, void, unknown> {
    try {
      if (!spyglass.intent) {
        yield "[]";
      }
      if (spyglass.scope === "all" || spyglass.scope === "my-qwest") {
        if (spyglass.fullResults?.length === 0) {
          yield "[]";
        }
      }
      if (spyglass.scope === "all" || spyglass.scope === "web") {
        if (spyglass.webSearches?.length === 0) {
          yield "[]";
        }
      }

      const processedResults: IProcessedResult[] = [];

      if (spyglass.scope === "all" || spyglass.scope === "my-qwest") {
        const myResults = this.processInternalResults(spyglass);
        processedResults.push(...myResults);
      }
      if (spyglass.scope === "all" || spyglass.scope === "web") {
        const processedWebResults = await this.processWebResults(spyglass);
        processedResults.push(...processedWebResults);
      }

      const findingsPrompt = this.findingsPromptBuilder(
        spyglass,
        Modes[spyglass.intent?.mode as keyof typeof Modes],
      );

      processedResults.forEach((result, i) => {
        const totalSize = findingsPrompt.get().length;
        const { id, prompt } = result;
        if (totalSize + prompt.length > max_lm_prompt_size) {
          return;
        }
        findingsPrompt.addBlock(`Result ${i + 1}`, prompt, 2);
      });

      const lm = getLM().withModel("fast-accurate");
      for await (const result of lm.generateJSONStream(
        findingsPrompt.get(),
        this.findingsSchema(processedResults.map((r) => r.id.toString())),
      )) {
        if (!result) {
          throw new Error("Findings not generated by LM");
        }
        yield result;
      }
    } catch (error) {
      console.error("Error generating findings from results:", error);
      throw error;
    }
  }

  static findingToString(
    finding: IFinding,
    citationMap: ICitationMap,
    index: number,
  ) {
    let t = "";
    const { excerpt, analysis, sourceId, findingType } = finding;
    const source = citationMap[sourceId];
    t += "<finding>";
    t += `  <sourceId>${sourceId}</sourceId>`;
    if (source.type === "internal" && source.value.value.type === "idea") {
      t += `  <sourceTitle>${source.value.value.title}</sourceTitle>`;
    }
    t += `  <findingNumber>${index}</findingNumber>`;
    t += `  <excerpt>${htmlToMarkdown(excerpt)}</excerpt>`;
    t += `  <type>${findingType}</type>`;
    t += `  <analysis>${htmlToMarkdown(analysis)}</analysis>`;
    t += "</finding>";
    return t;
  }

  static async *generateOverviewFromFindings(
    spyglass: ISpyglassSearch,
  ): AsyncGenerator<string, void, unknown> {
    try {
      const analysis = spyglass.analysis;
      if (!analysis || analysis?.findings.length === 0) {
        yield "There were no results to analyze.";
        return;
      }
      const intent = spyglass.intent;
      if (!intent) {
        yield "Something went wrong";
        return;
      }
      const findingsString: string[] = [];
      const citationMap = this.getCitationMap({
        internalResults: spyglass.fullResults,
        webResults: spyglass.webSearches
          ? ((await WebSearch.getResultsForWebSearches(spyglass.webSearches)) ??
            [])
          : [],
      });
      let index = 0;
      for (const finding of analysis.findings) {
        findingsString.push(this.findingToString(finding, citationMap, index));
        index++;
      }
      const overviewPrompt = this.overviewPromptBuilder(
        spyglass,
        Modes[intent.mode],
      );
      findingsString.forEach((s, i) => {
        const totalSize = overviewPrompt.get().length;
        if (totalSize + s.length > max_lm_prompt_size) {
          return;
        }
        overviewPrompt.addBlock(`Finding ${i + 1}`, s, 2);
      });

      const lm = getLM().withModel("simple");
      for await (const chunk of lm.generateStream(overviewPrompt.get())) {
        yield chunk;
      }
    } catch (error) {
      console.error("Error generating overview stream from findings:", error);
      throw error;
    }
  }
}
