import { IIdea, IIdeaAsRelation } from "../database/models/ideas";
import { IUserFile } from "../database/models/userfile";

export type ISearchResult = {
  score: number;
  node: (IIdeaAsRelation | IUserFile);
  highlightText: string; // Placeholder for potential future implementation
  debug?: {
    semanticScore: number;
    exactTitleBonus: number;
  };
}

export class Search {
  constructor() {}

  static async up() {
  }

  static async down() {
  }

  static async keywordSearch(userId: string, query: string) {
    try {

    }
  }

  static async suggest(userId: string, query: string) {

  }
}

export const initSearch = async () => {
  await Search.up();
};

export const dropSearch = async () => {
  await Search.down();
};
