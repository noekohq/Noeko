import { ResponseSchema, SchemaType } from "@google/generative-ai";
import { getLM, PromptBuilder } from "../semantics/lm";
import { ISearchOverview, ISearchResult, Search } from "./Search";
import { IIdea } from "../database/models/ideas";
import { htmlToMarkdown } from "../utils/formatting";
import { max_lm_prompt_size } from "../settings";
import { getFormattedDateTimeToday } from "../utils/prompts/components";

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

const Modes: Record<string, ISpyglassMode> = {
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
          If the necessary information is not available in the analysis, state that.

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
          Generate a list of the identified items.
          - Use a bulleted list (\`-\`) unless the items have a natural order (e.g., steps).
          - If categories are present in the analysis, use bold text for category titles.
          - Conclude with a single, brief summary paragraph.

          **DO NOT** use Markdown headings (#).
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
        "Broad queries where the user wants to understand a complex concept or topic in detail.",
      examples: ["What is the history of the internet?", "How does DNS work?"],
    },
    response: {
      description:
        "An explanatory article that introduces a topic, details its key components in separate sections, and concludes with a summary.",
      prompt: () =>
        new PromptBuilder().addBlock(
          "Instructions",
          `
          Compose an article explaining the topic. Follow this structure:
          1.  **Introduction**: A paragraph providing a high-level overview.
          2.  **Body**: Multiple sections with clear Markdown headings (\`##\`) that break down the core concepts in a logical progression.
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
        "A detailed comparison of two or more items, highlighting similarities and differences, presented in a Markdown table.",
      prompt: () =>
        new PromptBuilder().addBlock(
          "Instructions",
          `
          1.  Write a brief introductory paragraph that names the items being compared.
          2.  Generate a Markdown table to compare the items.
              - The first column should be the 'Feature' or 'Aspect' being compared.
              - Subsequent columns should be for each item.
          3.  Populate the table with concise points.
          4.  Conclude with a summary paragraph highlighting the most important similarities and differences.
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
            1.  **Identify Format**: Carefully read the user's query below and determine the specific output format they have requested.
            2.  **Extract Content**: From the provided source material, extract all information necessary to populate the format identified in step 1.

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

// TODO: This will be absorbed into modes above
const queryModes: {
  name: string;
  description: string;
  specificInstructions: string[];
}[] = [
  {
    name: "Direct Q&A",
    description:
      "This mode is for when a user asks a specific, direct question to their knowledge base. The goal is to provide a single, accurate, and concise answer.",
    specificInstructions: [
      "Your primary goal is to answer the user's question directly and concisely. Avoid providing broad, unnecessary background information.",
      "Begin the response with the direct answer in the very first sentence. The rest of the response should only provide essential supporting context.",
      "Prioritize findings with the types: FACT, DEFINITION, and EXPLANATION to construct your answer.",
      "Synthesize multiple relevant findings into one cohesive answer. Do not list out different findings separately.",
      "If the findings do not contain a direct answer to the question, you MUST explicitly state that the information is not available in the knowledge base. Do not attempt to infer or guess the answer.",
      "Keep the response to 1-2 paragraphs maximum. Use simple sentence and paragraph structure.",
    ],
  },
  {
    name: "Synthesis Report",
    description:
      "This is the standard mode for general knowledge queries, the goal is to provide a comprehensive and detailed answer that covers all aspects of the user's query.",
    specificInstructions: [
      "Start with a brief, one-paragraph summary of the key information.",
      "Structure the main body of the response using headings for sub-topics.",
      "Prioritize FACT, DEFINITION, and EXPLANATION findings to build the core of the report.",
      "Weave in PERSONAL_INSIGHT and QUOTE findings to add color and personal context, but they should support the main narrative, not lead it.",
      "Ensure the report is well-organized, coherent, and easy to follow.",
    ],
  },
  {
    name: "Insight Review",
    description:
      "This mode is for when the user wants to review their own thinking process. The goal is to provide a reflective experience and insight to the user's thought process, in accordance with their query.",
    specificInstructions: [
      "You MUST prioritize findings with the PERSONAL_INSIGHT type above all others. Also, give high priority to KEY_TAKEAWAY and OPEN_QUESTION.",
      "Structure the output as a narrative review. Use blockquotes (>) for direct PERSONAL_INSIGHT excerpts.",
      "The tone should be more reflective. It is acceptable to frame the answer from the user's perspective, for example: 'Your main insight was that...' or 'You seem to have concluded that...'",
      "Factual findings (FACT, DEFINITION) should only be used to provide brief context for the personal insights.",
    ],
  },
  {
    name: "Action Summary",
    description:
      "This mode is for when the user is planning or reviewing tasks. The goal is to provide a clear, actionable list of action items.",
    specificInstructions: [
      "Start with a concise overview of the user's action items",
      "Prioritize actionability on the user's behalf, providing only necessary context to take action on an item.",
      "You MUST only use findings with the ACTION_ITEM type to construct your todo-list",
      "Group related tasks under subheadings based on their source or topic.",
      "Prioritize flat text structure, avoid heading tags, use bold text for emphasis or categorization.",
      "use a standard list format to construct the lists.",
    ],
  },
  {
    name: "Comparative Analysis",
    description:
      "This mode is for when the user wants to understand the relationship between two or more concepts. Your goal is to create a structured comparison of the concepts mentioned in the query.",
    specificInstructions: [
      "You MUST format the core of your response as an HTML table with <table>.",
      "The table columns should be the items being compared (e.g., 'Permaculture', 'Syntropic Agroforestry')",
      "The table rows should be the criteria for comparison (e.g., 'Core Principles', 'Key Proponents', 'Implementation Challenges').",
      "Use FACT, DEFINITION, and KEY_TAKEAWAY findings to populate the table. Use CONTRADICTION findings to highlight key differences.",
      "Conclude with a brief summary paragraph highlighting the most significant similarities and differences.",
    ],
  },
  {
    name: "Question Drilldown",
    description:
      "This mode is for exploring the user's knowledge gaps. Your goal is to help a user understand the gaps in their knowledge, and unanswered questions they have.",
    specificInstructions: [
      "The lack of a relevant finding that should be there implies a gap in knowledge",
      "Only in this mode may you reference content that isn't specifically included in findings.",
      "Use KNOWLEDGE_GAP findings to identify gaps in the user's knowledge. As well as OPEN_QUESTION findings to identify unanswered questions.",
      "Conclude with a brief summary paragraph highlighting the most significant knowledge gaps and steps to address them.",
    ],
  },
];

const spyglassMissionStatement = `
  To answer the user's query with the best possible answer, embodying the following principles:
  1. Accuracy: our answers only include information that is supported by our sources.
  2. Clarity: our answers are clear and easy to understand.
  3. Completeness: our answers are comprehensive and directly cover all relevant aspects of the user's query.
`;

export default class Spyglass {
  constructor() {}

  static async getResults(userId: string, query: string) {
    return await Search.comprehensiveSearch(userId, query);
  }

  static async getResultsFromQueries(
    userId: string,
    queries: string[],
  ): Promise<ISearchResult[]> {
    const resultsExisting = new Set<string>();
    const allResults: ISearchResult[] = [];
    for (const query of queries) {
      const results = await Search.comprehensiveSearch(userId, query);
      if (results) {
        allResults.push(
          ...results.filter((f) => {
            if (!resultsExisting.has(f.id.toString())) {
              resultsExisting.add(f.id.toString());
              return true;
            }
            return false;
          }),
        );
      } else {
        console.error(
          "Couldn't find results in getResultsFromQueries for: ",
          query,
        );
      }
    }
    return allResults;
  }

  static intentPromptBuilder(query: string) {
    return new PromptBuilder()
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
        You are part of a search engine called Spyglass in an app called Qwest. The goal of the system is to provide a natural language answer to any user's search, with the entire answer based on their own notes. This means that user queries are likely to be reflective and personal, as well as analytical.
        `,
      )
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
        Search queries can utilize both semantic and FTS search, the system utilizes cosine similarity on embeddings vectors to offer semantic search, and uses an FTS search index with BM25 ranking, as well as Jaro Winkler string distance on titles.

        Given that information, you should build queries that are optimized to fetch relevant results to the user's intent. These queries can be short or long, and rich in intent or specifics.

        Optimize the queries heavily towards the user's intent, but don't go overboard.
        You are looking to cherry-pick the highest possible quality results from the user's knowledge-base.

        Search Queries will be used to search all of the information in the user's knowledge-base, and thus should be optimized to fetch relevant results to the user's intent.

        **DO NOT** write too many Search Queries, rather design for quality not quantity, but ultimately adhere to the user's intent.
        **DO** write extremely optimized queries designed to find the most relevant notes to the user's intent.
        `,
      )
      .addBlock(
        "User Query",
        `
        The user's query is as follows:
        <userquery>
        ${query}
        </userquery>
        `,
      );
  }

  static findingsPromptBuilder(query: string, mode: ISpyglassMode) {
    return (
      new PromptBuilder()
        // --- Insight: Stronger, more specific persona.
        .addText(
          "You are a data extraction and analysis engine called Spyglass Analyst. Your sole purpose is to extract relevant information from a given text based on a user query.",
        )
        .addBlock(
          "Purpose and Goal",
          `
            Your goal is to provide the most relevant excerpts to the query from the provided results.
            Quality of analysis is paramount for quality search experience for your users, you exist to provide an additional layer of intelligence and context.
            Your analysis will be built upon by other systems, so it's crucial to be reliable, precise, and foreward-thinking.
            Your primary source of context is the user's query. Use it to inform each finding directly. If something isn't relevant
            to the query's intent, don't include it.
            `,
        )
        .addBlock(
          "Context",
          `
          It is currently ${getFormattedDateTimeToday()}.
          You are part of a search engine called Spyglass in an app called Qwest. The goal of the system is to provide a natural language answer to any user's search, with the entire answer based on their own notes. This means that user queries are likely to be reflective and personal, as well as analytical.
          `,
        )
        .addBlock("Mission Statement", spyglassMissionStatement)
        .addBlock(
          "Strict Rules",
          `
          - **DO NOT** interpret or infer information not present in the results.
          - **DO NOT** add your own knowledge.
          - **DO NOT** overanalyze, find the right amount of sources to answer the question, only searching deeply IF SPECIFICALLY REQUESTED.
          - **DO NOT** split a continuous excerpt into multiple when it could be self-contained.
          - Your primary goal is to find UNIQUE and DIVERSE findings. If multiple sources mention the same core idea (e.g., 'Chicken Wings'), create only one finding for that idea and list all relevant source IDs."
          `,
        )
        .addBlock("User Query", query)
        .addText(mode.analysis.prompt(query).get())
        .addBlock("Search Results", "The results to use are as follows:\n")
    );
  }

  static findingsSchema(sourceIds: string[]): ResponseSchema {
    return {
      type: SchemaType.ARRAY,
      description:
        "An array of structured findings extracted from the source results that are relevant to the user's query.",
      items: {
        type: SchemaType.OBJECT,
        description:
          "A single, discrete finding that helps answer the user's query.",
        properties: {
          sourceId: {
            type: SchemaType.STRING,
            description:
              "The unique ID of the source result from which the excerpt is taken.",
            enum: sourceIds,
            format: "enum",
          },
          excerpt: {
            type: SchemaType.STRING,
            description:
              "The verbatim, direct quote from the source text that supports the finding. This must not be altered or summarized.",
          },
          analysis: {
            type: SchemaType.STRING,
            description:
              "A brief, one-sentence explanation of *why* this excerpt is important and how it directly helps answer the user's query.",
          },
          // --- Updated the enum with the new, more detailed taxonomy for qwest.
          findingType: {
            type: SchemaType.STRING,
            description:
              "Categorize the nature of the finding in relation to the query, based on the nature of personal knowledge-bases.",
            enum: [...FindingTypes],
            format: "enum",
          },
        },
        required: ["sourceId", "excerpt", "analysis", "findingType"],
      },
    };
  }

  static overviewPromptBuilder(query: string, mode: ISpyglassMode) {
    return (
      new PromptBuilder()
        // --- Insight: Adopting the more polished persona we discussed.
        .addText(
          "You are Spyglass, a helpful and comprehensive AI search assistant. Your goal is to provide an accurate, unbiased, and expertly written answer to the user's query by synthesizing the provided findings.",
        )
        .addBlock(
          "Context",
          `
          It is currently ${getFormattedDateTimeToday()}.
          You are part of a search engine called Spyglass in an app called Qwest. The goal of the system is to provide a natural language answer to any user's search, with the entire answer based on their own notes. This means that user queries are likely to be reflective and personal, as well as analytical.
          `,
        )
        .addBlock("Mission Statement", spyglassMissionStatement)
        .addBlock(
          "Strict Rules (NEVER/AVOID)",
          `
          - **NEVER** use information that is not explicitly present in the Findings. If the Findings do not contain the answer, state that you cannot answer based on the information provided.
          - **NEVER** use moralizing or hedging language (e.g., "It is important to...", "It is subjective...").
          - **NEVER** refer to yourself as an AI, a model, or an assistant. Your name is Spyglass, but do not refer to yourself in the answer.
          - **NEVER** start your answer with a heading.
          `,
        )
        .addBlock(
          "How to Format",
          `
          You **MUST** write all of your responses as semantic HTML
          **DO NOT** use Markdown directly

          Use <span> tags with data-finding-number attributes to reference findings, for example:

          <span data-finding-number="1">
            this is some content that sources finding number 2
          </span>
          `,
        )
        .addBlock("User Query", query)
        .addText(mode.response.prompt(query).get())
        .addBlock(
          "Findings",
          "The findings to use for your answer are as follows:\n",
        )
    );
  }

  static intentSchema(): ResponseSchema {
    return {
      type: SchemaType.OBJECT,
      properties: {
        intent: {
          type: SchemaType.STRING,
          description: "The intent of the user's query.",
        },
        mode: {
          type: SchemaType.STRING,
          description: "The spyglassModeId of the mode to use",
          enum: [...Object.keys(Modes)],
          format: "enum",
        },
        queries: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.STRING,
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
  ): Promise<ISpyglassIntent | undefined> {
    try {
      if (!query.length) {
        return undefined;
      }
      const lm = getLM().withModel("simple");
      const prompt = this.intentPromptBuilder(query).get();
      const intent = await lm.generateJSON<ISpyglassIntent>(
        prompt,
        this.intentSchema(),
      );
      console.log("GOT INTENT: ", intent);
      if (!intent) {
        throw new Error("Did not get intent from LM");
      }
      return intent;
    } catch (error) {
      console.error("Error in getIntentFromQuery:", error);
      return undefined;
    }
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
      const resultsStrings = results
        .filter((r) => {
          return r.value?.type === "idea";
        })
        .map((result) => {
          let r = "";
          const { highlightText, value } = result;
          const ideaValue = value as IIdea;
          r += `**${ideaValue.title}** | ID: ${ideaValue.id.toString()}`;
          if (highlightText) {
            r += `System Highlighted Text: ${highlightText}`;
          }
          r += `${htmlToMarkdown(ideaValue.content)}`;
          return r;
        });
      const overviewPrompt = this.findingsPromptBuilder(
        query,
        Modes[intent.mode],
      );

      resultsStrings.forEach((s, i) => {
        // make sure we don't surpass lm prompt size
        const totalSize = overviewPrompt.get().length;
        if (totalSize + s.length > max_lm_prompt_size) {
          return;
        }
        overviewPrompt.addBlock(`Result ${i + 1}`, s, 2);
      });

      const lm = getLM().withModel("simple");
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
          let r = "";
          const { highlightText, value } = result;
          const ideaValue = value as IIdea;
          r += `**${ideaValue.title}** | ID: ${ideaValue.id.toString()}`;
          if (highlightText) {
            r += `System Highlighted Text: ${highlightText}`;
          }
          r += `${htmlToMarkdown(ideaValue.content)}`;
          return r;
        });
      const findingsPrompt = this.findingsPromptBuilder(
        query,
        Modes[intent.mode],
      );

      resultsStrings.forEach((s, i) => {
        // make sure we don't surpass lm prompt size
        const totalSize = findingsPrompt.get().length;
        if (totalSize + s.length > max_lm_prompt_size) {
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

  static async getOverviewFromFindings(
    query: string,
    findings: ISearchOverview["findings"],
    intent: ISpyglassIntent,
  ): Promise<ISearchOverview["overview"] | undefined> {
    try {
      if (findings.length === 0) {
        return "There were no results to analyze.";
      }
      const findingsString = findings.map((finding, index) => {
        let t = "";
        const { excerpt, analysis, sourceId, findingType } = finding;
        t += "<finding>";
        t += `  <sourceId>${sourceId}</sourceId>`;
        t += `  <findingNumber>${index}</findingNumber>`;
        t += `  <excerpt>${htmlToMarkdown(excerpt)}</excerpt>`;
        t += `  <type>${findingType}</type>`;
        t += `  <analysis>${htmlToMarkdown(analysis)}</analysis>`;
        t += "</finding>";
        return t;
      });
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
        overviewPrompt.addBlock(`Result ${i + 1}`, s, 2);
      });

      const lm = getLM().withModel("simple");
      const result = await lm.generateJSON<ISearchOverview["overview"]>(
        overviewPrompt.get(),
        {
          type: SchemaType.STRING,
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
  ): AsyncGenerator<string, void, unknown> {
    try {
      if (findings.length === 0) {
        yield "There were no results to analyze.";
        return;
      }
      const findingsString = findings.map((finding, index) => {
        let t = "";
        const { excerpt, analysis, sourceId, findingType } = finding;
        t += "<finding>";
        t += `  <sourceId>${sourceId}</sourceId>`;
        t += `  <findingNumber>${index}</findingNumber>`;
        t += `  <excerpt>${htmlToMarkdown(excerpt)}</excerpt>`;
        t += `  <type>${findingType}</type>`;
        t += `  <analysis>${htmlToMarkdown(analysis)}</analysis>`;
        t += "</finding>";
        return t;
      });
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
      for await (const chunk of lm.generateStream(overviewPrompt.get())) {
        yield chunk;
      }
    } catch (error) {
      console.error("Error generating overview stream from findings:", error);
      throw error;
    }
  }
}
