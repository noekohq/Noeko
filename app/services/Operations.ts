import { Idea } from "../database/models/ideas";

export default class Operations {
  constructor() {}

  static async refreshAllEmbeddings() {
    try {
      return true;
    } catch (error) {
      console.error("Something went wrong refreshing all embeddings: ", error);
      return false;
    }
  }
}
