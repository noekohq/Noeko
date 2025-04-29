import { getDatabase } from "../database/db";
import { IIdea, IIdeaAsRelation } from "../database/models/ideas";
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

export class Search {
  constructor() {}

  static async up() {
    const semanticSearchFunction = () => {
      return `
      DEFINE FUNCTION OVERWRITE fn::hnsw_search(
        $user_id: string,
        $query_embeddings: array<F32>,
      ) {
      }
      `;
    };

    const vectorEmbeddingsIndex = () => {
      return `
      -- Recommended Index for Google Text Embeddings (e.g., 768 dimensions)
      DEFINE INDEX OVERWRITE idx_idea_embeddings_hnsw
      ON idea
      FIELDS embeddings
      HNSW
      DIMENSION 768   -- Replace 768 with your model's actual dimension
      TYPE F32        -- Use 32-bit floats
      DIST COSINE;    -- Use Cosine distance
      `;
    };

    const ideaSearchAnalyzer = () => {
      return `
      DEFINE ANALYZER idea_analyzer
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

    const db = await getDatabase();
    // db?.query(keywordSearchFunction());
    // db?.query(vectorEmbeddingsIndex());
    db?.query(ideaSearchAnalyzer());
    db?.query(ftsTitleSearchIndex());
    db?.query(ftsContentSearchIndex());
  }

  static async down() {}

  static async keywordSearch(userId: string, query: string) {
    try {
    } catch (error) {
      console.error("Error searching by keyword...", error);
      return undefined;
    }
  }

  static async suggest(userId: string, query: string) {}
}

export const initSearch = async () => {
  await Search.up();
};

export const dropSearch = async () => {
  await Search.down();
};
