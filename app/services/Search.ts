import { getDatabase } from "../database/db";
import { Idea, IIdea, IIdeaAsRelation } from "../database/models/ideas";
import { IUserFile } from "../database/models/userfile";

export type ISearchResult = {
  score: number;
  node: IIdeaAsRelation | IUserFile;
  highlightText: string; // Placeholder for potential future implementation
  debug?: {
    semanticScore: number;
    exactTitleBonus: number;
  };
};

export type IFTSIdeaResult = IIdea & {
  contentScore: number;
  titleScore: number;
  preview: string;
};

export class Search {
  constructor() {}

  static async up() {
    const ideaSearchAnalyzer = () => {
      return `
      DEFINE ANALYZER OVERWRITE idea_analyzer
      TOKENIZERS class
      FILTERS lowercase;`;
    };

    const ftsTitleSearchIndex = () => {
      return `
      DEFINE INDEX OVERWRITE idx_idea_title_fts
        ON TABLE idea
        FIELDS title
        SEARCH ANALYZER idea_analyzer
        BM25 HIGHLIGHTS;
      `;
    };

    const ftsContentSearchIndex = () => {
      return `
      DEFINE INDEX OVERWRITE idx_idea_content_fts
        ON TABLE idea
        FIELDS contentPlain
        SEARCH ANALYZER idea_analyzer
        BM25 HIGHLIGHTS;
      `;
    };

    const ftsSearchFunction = () => {
      return `
      DEFINE FUNCTION OVERWRITE fn::search_user_ideas_fts(
        $userId: string,
        $query: string
      ) {
        LET $ideas = SELECT
            *,
            contentPlain,
            title,
            search::highlight("->", "<-", 0) AS preview,
            search::score(0) AS contentScore,
            search::score(1) AS titleScore
        FROM idea
        WHERE
            (contentPlain @0@ $query OR
            title @1@ $query)
            AND <-owns<-(user WHERE id = <record> $userId);

        return $ideas;
      }`;
    };

    const searchSimilarToIdea = () => {
      return `
      DEFINE FUNCTION OVERWRITE fn::search_similar_to_idea(
        $ideaId: string,
        $userId: string,
        $limit: int
      ) {
        LET $embeddings = SELECT embeddings FROM ONLY <record> $ideaId;
        LET $userIdeas = SELECT VALUE ->owns->idea.id FROM ONLY <record> $userId;

        LET $results =
            SELECT
                *,
                vector::similarity::cosine(embeddings, $embeddings.embeddings) AS distance,
                ->is_source_for->(?).* as derivedList
            FROM idea
            WHERE id IN $userIdeas
            ORDER BY distance DESC
            LIMIT $limit;

        RETURN $results;
      }
          `;
    };

    const searchSimilarToEmbeddings = () => {
      return `
      DEFINE FUNCTION OVERWRITE fn::search_similar_to_embeddings(
        $provided_embeddings: array<float>,
        $userId: string,
        $limit: int
      ) {
        LET $userIdeas = SELECT VALUE ->owns->idea.id FROM ONLY <record> $userId;

        LET $results =
            SELECT
                *,
                vector::similarity::cosine(embeddings, $provided_embeddings) AS distance,
                ->is_source_for->(?).* as derivedList
            FROM idea
            WHERE id IN $userIdeas
            ORDER BY distance DESC
            LIMIT $limit;

        RETURN $results;
      }
          `;
    };

    const db = await getDatabase();
    await db?.query(ideaSearchAnalyzer());
    await db?.query(ftsTitleSearchIndex());
    await db?.query(ftsContentSearchIndex());
    await db?.query(ftsSearchFunction());
    await db?.query(searchSimilarToIdea());
    await db?.query(searchSimilarToEmbeddings());
  }

  static async down() {}

  static async ftsSearch(userId: string, query: string) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Database not initialized");
      }
      const results = await db.run<IFTSIdeaResult[]>(
        "fn::search_user_ideas_fts",
        [userId, query],
      );
      if (!results || results.length === 0) {
        return [];
      }
      return results;
    } catch (error) {
      console.error("Error searching by keyword...", error);
      return undefined;
    }
  }

  static async suggest(userId: string, query: string) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Database not initialized");
      }
      if (!query) {
        return Idea.getUserIdeas(userId);
      }
      const suggestions = await Search.ftsSearch(userId, query);
      if (!suggestions) {
        return [];
      }
      return suggestions;
    } catch (error) {
      console.error("Error suggesting...", error);
      return undefined;
    }
  }
}

export const initSearch = async () => {
  await Search.up();
};

export const dropSearch = async () => {
  await Search.down();
};
