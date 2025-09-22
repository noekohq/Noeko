import { getLM } from "../ai/lms/lm";
import { LMSchema, LMSchemaType } from "../ai/lms";
import { PromptBuilder } from "../ai/lms/utils";
import { ISearchResult, Search } from "./Search";
import { htmlToMarkdown } from "../utils/formatting";
import { max_lm_prompt_size } from "../settings";
import { getFormattedDateTimeToday } from "../utils/prompts/components";
import { ISearchOverview, ISpyglassSearch } from "../database/models/search";
import { RecordId } from "surrealdb";
import Source, { ISourceAnalysis } from "../database/models/source";

type ICitationMap = Record<string, ISearchResult>;

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
  | "ANSWERED_QUESTION"
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
  "ANSWERED_QUESTION",
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

export default class Spyglass {
  constructor() {}

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

  static getCitationMap(results: ISearchResult[]): ICitationMap {
    return results.reduce((map, result) => {
      map[result.id.toString()] = result;
      return map;
    }, {} as ICitationMap);
  }

  static intentPromptBuilder(query: string, parent?: ISpyglassSearch | null) {
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
        You are part of a search engine called Spyglass in an app called Noeko. The goal of the system is to provide a natural language answer to any user's search, with the entire answer based on their own notes. This means that user queries are likely to be reflective and personal, as well as analytical.
        `,
      );

    if (parent && parent.intent) {
      builder.addBlock(
        "Follow-Up Context",
        `
        Crucially, this is a follow-up to a previous query. Thus, your response should be based on the previous query and the user's intent.

        Keep the fact that this is a follow-up question in mind, as it should influence your sources and the way you approach the query.

        <previousQuery>
        ${parent.baseQuery}
        </previousQuery>

        The user's intent was classified as:
        <previousIntent>
        ${parent.intent.intent}
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
        ${query}
        </userquery>
        `,
      );

    return builder;
  }

  static findingsPromptBuilder(intent: string, mode: ISpyglassMode) {
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
            You are part of a search engine called Spyglass in an app called Noeko. The goal of the system is to provide a natural language answer to any user's search, with the entire answer based on their own notes. This means that user queries are likely to be reflective and personal, as well as analytical.
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
        // --- MODIFICATION END ---

        .addBlock("User Intent", intent)
        .addText(mode.analysis.prompt(intent).get()) // This dynamic prompt remains
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
          // --- Updated the enum with the new, more detailed taxonomy for noeko.
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

  static overviewPromptBuilder(
    query: string,
    mode: ISpyglassMode,
    parent?: ISpyglassSearch | null,
  ) {
    const builder = new PromptBuilder()
      // --- Insight: Adopting the more polished persona we discussed.
      .addText(
        "You are Spyglass, a helpful and comprehensive AI search assistant. Your goal is to provide an accurate, unbiased, and expertly written answer to the user's query by synthesizing the provided findings.",
      )
      .addBlock(
        "Context",
        `
          It is currently ${getFormattedDateTimeToday()}.
          You are part of a search engine called Spyglass in an app called Noeko. The goal of the system is to provide a natural language answer to any user's search, with the entire answer based on their own notes. This means that user queries are likely to be reflective and personal, as well as analytical.
          `,
      );

    if (parent) {
      let parentContext = `
      Crucially, this question is a follow-up to a previous query.
      The response should flow from the previous query and response.
      Previous Query:
      <previousQuery>
        ${parent.baseQuery}
      </previousQuery>

      `;

      if (parent.analysis?.findings && parent.analysis.findings.length > 0) {
        const findingsText = parent.analysis?.findings
          .map((f, i) => `* Finding ${i + 1}: ${f.analysis}`)
          .join("\n");
        parentContext += `\n\nHere are the findings from the previous query:\n${findingsText}`;
      }

      if (parent.analysis) {
        parentContext += `
        And here was the final response based on those findings:
        <previousResponse>
          ${parent.analysis?.overview}
        </previousResponse>
        `;
      }
      builder.addBlock("Follow-Up Context", parentContext);
    }

    builder
      .addBlock("Mission Statement", spyglassMissionStatement)
      .addText(mode.response.prompt(query).get())
      .addBlock(
        "Output and Citation Rules",
        `
          - Your entire response MUST be valid Markdown.
          - At the end of any sentence that uses information from the findings, you MUST add a citation.
          - Place the citation immediately after the last word of the sentence, with no space.
          - The format is a single, 1-based finding number inside brackets, like \`[1]\`.
          - If multiple findings support a sentence, list each citation in its own separate brackets, like \`[1][2]\`.

          ## Example:
          "Noeko is a knowledge management application designed to provide natural language answers from a user's notes[1]. Its core philosophy is to help users organize their thoughts and curate knowledge effectively[2][3]."
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
          ${query}
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
    query: string,
    parent?: ISpyglassSearch | null,
  ): Promise<ISpyglassIntent | undefined> {
    try {
      if (!query.length) {
        return undefined;
      }
      const lm = getLM().withModel("simple");
      const prompt = this.intentPromptBuilder(query, parent).get();
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
    r += "<result>";
    if (value.type === "idea") {
      r += `  <title>${value.title}</title>`;
      r += `  <content>${htmlToMarkdown(value.content)}</content>`;
      r += `  <type>User note</type>`;
    }
    if (value.type === "task") {
      r += `  <title>${value.description}</title>`;
      r += `  <content>${htmlToMarkdown(value.scratchpad)}</content>`;
      r += `  <type>User task</type>`;
    }
    if (value.type === "source") {
      r += `  <title>${value.displayName}</title>`;
      r += `  <content>${htmlToMarkdown(value.content)}</content>`;
      r += `  <type>User saved source</type>`;
    }
    if (value.type === "excerpt") {
      r += `  <sourceText>${value.sourceText}</sourceText>`;
      r += `  <userNote>${htmlToMarkdown(value.note)}</userNote>`;
      r += `  <type>User saved excerpt from source</type>`;
    }
    r += ` <id>${value.id.toString()}</id>`;
    if (highlightText) {
      r += `  <systemHighlightedText>${highlightText}</systemHighlightedText>`;
    }
    r += "</result>";
    return r;
  }

  static async getFindingsFromResults(
    query: string,
    results: ISearchResult[],
    intent: ISpyglassIntent,
  ): Promise<ISearchOverview["findings"] | undefined> {
    try {
      if (results.length === 0) {
        return [];
      }
      const resultsStrings = results.map((result) => {
        return this.resultToString(result);
      });
      const overviewPrompt = this.findingsPromptBuilder(
        intent.intent,
        Modes[intent.mode],
      );

      resultsStrings.forEach((s, i) => {
        // make sure we don't surpass lm prompt size
        const totalSize = overviewPrompt.get().length;
        if (totalSize + s.length > max_lm_prompt_size) {
          console.warn(`Omitting result ${i + 1} due to prompt size limit`);
          return;
        }
        overviewPrompt.addBlock(`Result ${i + 1}`, s, 2);
      });

      const lm = getLM().withModel("fast-accurate");
      const result = await lm.generateJSON<ISearchOverview["findings"]>(
        overviewPrompt.get(),
        this.findingsSchema(results.map((r) => r.id.toString())),
      );
      if (!result) {
        throw new Error("Findings not generated by LM");
      }
      return result;
    } catch (error) {
      console.error("Error getting findings from results:", error);
      return undefined;
    }
  }

  static async *generateFindingsFromResults(
    query: string,
    results: ISearchResult[],
    intent: ISpyglassIntent,
  ): AsyncGenerator<string, void, unknown> {
    /* We should update this to analyze each result in parallel instead of each result appended. It would improve accuracy and speed. */
    try {
      if (results.length === 0) {
        yield `[]`;
        return;
      }
      const resultsStrings = results
        .filter((r) => {
          return r.value?.type === "idea";
        })
        .map((result) => {
          return this.resultToString(result);
        });
      const findingsPrompt = this.findingsPromptBuilder(
        query,
        Modes[intent.mode],
      );

      resultsStrings.forEach((s, i) => {
        const totalSize = findingsPrompt.get().length;
        if (totalSize + s.length > max_lm_prompt_size) {
          console.info(`Omitting a result with a size of ${s.length}`);
          return;
        }
        findingsPrompt.addBlock(`Result ${i + 1}`, s, 2);
      });

      const lm = getLM().withModel("simple");
      for await (const result of lm.generateJSONStream(
        findingsPrompt.get(),
        this.findingsSchema(results.map((r) => r.id.toString())),
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

  static singleFindingPromptBuilder(
    query: string,
    intent: string,
    mode: ISpyglassMode,
  ) {
    return new PromptBuilder()
      .addText(
        "You are a data extraction and analysis engine called Spyglass Analyst. Your sole purpose is to extract relevant information from a given text based on a user intent.",
      )
      .addBlock(
        "Context",
        `
          Here is some context for you to use in formation of your analysis:
          <context>
            It is currently ${getFormattedDateTimeToday()}.
            You are part of a search engine called Spyglass in an app called Noeko. The goal of the system is to provide a natural language answer to any user's search, with the entire answer based on their own notes. This means that user queries are likely to be reflective and personal, as well as analytical.
          </context>
          `,
      )
      .addBlock(
        "Source Material Types",
        `
          There are four different types of resource that you might come across in results from your sources. All are curated by the user.

          Types:
          - Idea: these are directly created by the user, and are units of user knowledge
          - Task: these are things that the user needs to do
          - Source: these are user saved sources of external knowledge
          - Excerpt: these are saved notes on specific source text from sources
        `,
      )
      .addBlock("Mission Statement", spyglassMissionStatement)
      .addBlock(
        "Core Task and Rules",
        `
          Your goal is to meticulously analyze the single piece of Source Material and extract **exclusively** those findings that are directly and positively relevant to the "User Intent". You must act as a strict filter.

          **Strict Rules:**
          - **The Zero-Finding Rule:** It is essential that you return an empty array \`[]\` if no excerpts in the Source Material directly and strongly answer the User Intent. **It is better to find nothing than to include irrelevant or weakly related information.** Do not force a finding.
          - **Positive Findings Only:** Your final report must only contain positive, relevant findings. Never report that a result was irrelevant or that information was missing.
          - **Adhere to the Source:** Your analysis MUST be based ONLY on the provided Source Material. DO NOT add your own knowledge or infer information not explicitly present.
          `,
      )
      .addBlock(
        "User Query",
        `
        The initial user query is as follows:
        <query>
          ${query}
        </query>
        `,
      )
      .addBlock("User Intent", intent)
      .addText(mode.analysis.prompt(intent).get()) // This dynamic prompt remains
      .addBlock(
        "Source for Analysis",
        "The Source Material to use is as follows:\n",
      );
  }

  static async *generateFindingsFromResources(
    query: string,
    results: ISearchResult[],
    intent: ISpyglassIntent,
  ): AsyncGenerator<IFinding[], void, unknown> {
    try {
      if (!results || results.length === 0) {
        return;
      }

      const lm = getLM().withModel("fast-accurate");

      const findingPromises = results.map((result) => {
        return (async () => {
          const sourceId = result.id.toString();
          const resultString = this.resultToString(result);

          const singleResultPrompt = this.singleFindingPromptBuilder(
            query,
            intent.intent,
            Modes[intent.mode],
          );

          singleResultPrompt.addBlock(`Source Material`, resultString, 2);

          try {
            const findings = await lm.generateJSON<IFinding[]>(
              singleResultPrompt.get(),
              this.findingsSchema([sourceId]),
            );
            return findings || [];
          } catch (err) {
            console.error(
              `Failed to process findings for result ${sourceId}:`,
              err,
            );
            return []; // Return an empty array on error.
          }
        })();
      });

      // 2. Await each promise individually and yield its result as it completes.
      // This allows the client to receive data much sooner.
      for (const promise of findingPromises) {
        const findings = await promise; // This waits for the next promise in the array to resolve.

        if (findings.length > 0) {
          // Yield the result as a JSON string for the client.
          yield findings;
        }
      }
    } catch (error) {
      console.error(
        "Error generating findings from resources in parallel:",
        error,
      );
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
    const type = source.value.type;
    t += "<finding>";
    t += `  <sourceType>${type}</sourceType>`;
    t += `  <sourceId>${sourceId}</sourceId>`;
    if (source.value.type === "idea") {
      t += `  <sourceTitle>${source.value.title}</sourceTitle>`;
    }
    if (source.value.type === "task") {
      t += `  <sourceTitle>${source.value.description}</sourceTitle>`;
    }
    if (source.value.type === "source") {
      t += `  <sourceTitle>${source.value.displayName}</sourceTitle>`;
    }
    t += `  <findingNumber>${index}</findingNumber>`;
    t += `  <excerpt>${htmlToMarkdown(excerpt)}</excerpt>`;
    t += `  <type>${findingType}</type>`;
    t += `  <analysis>${htmlToMarkdown(analysis)}</analysis>`;
    t += "</finding>";
    return t;
  }

  static async getOverviewFromFindings(
    query: string,
    findings: ISearchOverview["findings"],
    intent: ISpyglassIntent,
    results: ISearchResult[],
  ): Promise<ISearchOverview["overview"] | undefined> {
    try {
      if (findings.length === 0) {
        return "There were no results to analyze.";
      }
      const findingsString: string[] = [];
      let index = 0;
      const citationMap = this.getCitationMap(results);
      for (const finding of findings) {
        findingsString.push(this.findingToString(finding, citationMap, index));
        index++;
      }
      const overviewPrompt = this.overviewPromptBuilder(
        query,
        Modes[intent.mode],
      );

      findingsString.forEach((s, i) => {
        // make sure we don't surpass lm prompt size
        const totalSize = overviewPrompt.get().length;
        if (totalSize + s.length > max_lm_prompt_size) {
          return;
        }
        overviewPrompt.addBlock(`Finding ${i + 1}`, s, 2);
      });

      const lm = getLM().withModel("simple");
      const result = await lm.generateJSON<ISearchOverview["overview"]>(
        overviewPrompt.get(),
        {
          type: LMSchemaType.STRING,
          description:
            "A direct response to the user's query based on the findings.",
        },
      );
      if (!result) {
        throw new Error("Findings not generated by LM");
      }
      return result;
    } catch (error) {
      console.error("Error getting findings from results:", error);
      return undefined;
    }
  }

  static async *generateOverviewFromFindings(
    query: string,
    findings: ISearchOverview["findings"],
    intent: ISpyglassIntent,
    results: ISearchResult[],
    parent?: ISpyglassSearch,
  ): AsyncGenerator<string, void, unknown> {
    try {
      if (findings.length === 0) {
        yield "There were no results to analyze.";
        return;
      }
      const findingsString: string[] = [];
      const citationMap = this.getCitationMap(results);
      let index = 0;
      for (const finding of findings) {
        findingsString.push(this.findingToString(finding, citationMap, index));
        index++;
      }
      const overviewPrompt = this.overviewPromptBuilder(
        query,
        Modes[intent.mode],
        parent,
      );
      findingsString.forEach((s, i) => {
        // make sure we don't surpass lm prompt size
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

  static sourceFindingsSchema(sourceId: string): LMSchema {
    return {
      type: LMSchemaType.ARRAY,
      description:
        "An array of structured findings extracted from the source that are relevant to the prompt.",
      items: {
        type: LMSchemaType.OBJECT,
        description: "A single, discrete finding that reflects the prompt.",
        properties: {
          excerpt: {
            type: LMSchemaType.STRING,
            description:
              "The verbatim, direct quote from the source text that supports the finding. This must not be altered or summarized.",
          },
          analysis: {
            type: LMSchemaType.STRING,
            description:
              "A brief, one-sentence explanation of *why* this excerpt is important and how it's directly relevant to the prompt.",
          },
          findingType: {
            type: LMSchemaType.STRING,
            description:
              "Categorize the nature of the finding in relation to the prompt.",
            enum: [...FindingTypes],
            format: "enum",
          },
        },
        required: ["excerpt", "analysis", "findingType"],
      },
    };
  }

  static sourceFindingsPromptBuilder(
    sourceId: string | RecordId,
    prompt: string,
  ) {
    return new PromptBuilder()
      .addText(
        "You are a data extraction and analysis engine called Spyglass Analyst. Your sole purpose is to extract relevant information from a given text based on a given prompt.",
      )

      .addBlock(
        "Context",
        `
            Here is some context for you to use in formation of your analysis:
            <context>
              It is currently ${getFormattedDateTimeToday()}.
              You are part of a search engine called Spyglass in an app called Noeko. The goal of the system is to provide a natural language analysis of given Source Material.
            </context>
            `,
      )
      .addBlock("Mission Statement", spyglassMissionStatement)
      .addBlock(
        "Core Workflow and Strict Rules",
        `
            Your goal is to build a report of findings that are directly and positively relevant to the "Prompt". Your analysis is crucial and will be used by other systems, so precision is mandatory.

            **Universal Strict Rules:**
            - **Negative analysis is FORBIDDEN.** Never report that a result was irrelevant or that information was missing. Your final report must only contain positive, relevant findings.
            - **Adhere to the Source Material:** Your analysis MUST be based ONLY on the provided Source Material. DO NOT add your own knowledge or infer information not explicitly present.
            `,
      )
      .addBlock("Prompt", prompt)
      .addBlock(
        "Source Material",
        "The source material to use is as follows:\n",
      );
  }

  static async getFindingsFromSource(
    sourceId: string | RecordId,
    prompt: string,
  ): Promise<IFinding[] | undefined> {
    try {
      const source = await Source.get(sourceId);
      if (!source) {
        throw new Error("Couldn't get source for findings");
      }
      const findingsSchema = this.sourceFindingsSchema(sourceId.toString());
      const lm = getLM().withModel("general");
      const findingsPrompt = this.sourceFindingsPromptBuilder(sourceId, prompt);
      findingsPrompt.addText("<sourceMaterial>");
      findingsPrompt.addText(source.content);
      findingsPrompt.addText("</sourceMaterial>");
      const findings = await lm.generateJSON<Omit<IFinding, "sourceId">[]>(
        findingsPrompt.get(),
        findingsSchema,
      );
      if (!findings) {
        throw new Error("Couldn't get findings from Spyglass.");
      }
      const withSourceId: IFinding[] = findings.map((finding) => ({
        ...finding,
        sourceId: sourceId.toString(),
      }));
      return withSourceId;
    } catch (error) {
      console.error("Error getting findings from source: ", sourceId, error);
      return undefined;
    }
  }

  public static sourceAnalysisPromptBuilder(sourceId: string | RecordId) {
    return new PromptBuilder()
      .addText(
        "You are a data extraction and analysis engine called Spyglass Analyst. Your sole purpose is to extract relevant information from a given Source Material based on a given prompt.",
      )
      .addBlock("Source Material", "The Source Material is as follows:\n\n");
  }

  public static sourceAnalysisSchema(sourceId: string | RecordId) {
    return {
      type: LMSchemaType.OBJECT,
      description:
        "An object containing an analysis of the given source material",
      properties: {
        headline: {
          description:
            "A single, concise sentence that summarizes the document's absolute core message, finding, or purpose. This should be suitable as a title or headline.",
          type: LMSchemaType.STRING,
        },
        abstract: {
          description:
            "A dense, paragraph-length summary of the document's content. This should cover the main arguments, methods (if any), results, and conclusions presented in the text.",
          type: LMSchemaType.STRING,
        },
        outline: {
          description:
            "A structured list representing the document's flow. Identify each major section or thematic part of the document and provide a one-sentence summary for each part.",
          type: LMSchemaType.ARRAY,
          items: {
            type: LMSchemaType.OBJECT,
            properties: {
              section: {
                description:
                  "The title or heading of the document section (e.g., 'Introduction', 'Methodology', 'Chapter 3'). If there are no formal headings, create a logical name for the thematic section.",
                type: LMSchemaType.STRING,
              },
              summary: {
                description:
                  "A single sentence summarizing the content and purpose of that specific section.",
                type: LMSchemaType.STRING,
              },
            },
            required: ["section", "summary"],
          },
        },
      },
      required: ["headline", "abstract", "outline"],
    };
  }

  public static async analyzeSource(
    sourceId: string | RecordId,
  ): Promise<ISourceAnalysis | undefined> {
    try {
      const source = await Source.get(sourceId);
      if (!source) {
        throw new Error("Couldn't get source");
      }
      const analysisPrompt = this.sourceAnalysisPromptBuilder(sourceId);
      analysisPrompt.addText("<sourceMaterial>");
      analysisPrompt.addText(source.content);
      analysisPrompt.addText("</sourceMaterial>");
      const analysisSchema = this.sourceAnalysisSchema(sourceId);
      const lm = getLM().withModel("simple");
      const analysis = await lm.generateJSON<Omit<ISourceAnalysis, "findings">>(
        analysisPrompt.get(),
        analysisSchema,
      );
      if (!analysis) {
        throw new Error("Couldn't get analysis");
      }
      const full: ISourceAnalysis = {
        ...analysis,
      };
      return full;
    } catch (error) {
      console.error("Error analyzing source: ", sourceId, error);
      return undefined;
    }
  }
}
