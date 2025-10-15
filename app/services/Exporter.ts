import { RecordId, StringRecordId } from "surrealdb";

export default class Exporter {
  private userId: StringRecordId;

  constructor(userId: string | RecordId) {
    this.userId = new StringRecordId(userId);
  }

  public static exportToMarkdown() {}
}
