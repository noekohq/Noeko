import { RecordId, StringRecordId } from "surrealdb";
import { IWebSearchResultItem } from "../../../services/providers/web_search";
import { getDatabase } from "../../db";

export type IWebSearch = {
  id: string | RecordId;
  query: string;
  createdAt: Date;
  updatedAt: Date;
};

export type IWebSearchCreator = Omit<IWebSearch, "id">;
export type IWebSearchForm = Omit<IWebSearchCreator, "createdAt" | "updatedAt">;

export type IWebSearchResult = {
  id: string | RecordId;
  item: IWebSearchResultItem;
  createdAt: Date;
  updatedAt: Date;
};

export type IWebSearchResultCreator = Omit<IWebSearchResult, "id">;
export type IWebSearchResultForm = Omit<
  IWebSearchResultCreator,
  "createdAt" | "updatedAt"
>;

export class WebSearch {
  constructor() {}

  public static async up() {
    const getWebSearchRecordFunction = () => {
      return `
      DEFINE FUNCTION OVERWRITE fn::get_web_search_record(
        web_search_id: record<web_search>
      ) {
        LET $record =
          SELECT
            *
          FROM ONLY web_search_id;
        RETURN $record;
      }
      `;
    };

    const db = await getDatabase();
    if (!db) {
      console.error(
        "Couldn't establish database connection when bringing up websearch model",
      );
      return;
    }
    await db.query(getWebSearchRecordFunction());
  }

  public static async record(
    search: IWebSearch,
    results: IWebSearchResultForm[],
  ) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Couldn't get database");
      }
      const searchRecordResult = await db.create<IWebSearch, IWebSearchCreator>(
        "web_search",
        {
          ...search,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      );
      if (!searchRecordResult[0]) {
        throw new Error("Failed to create web result record");
      }
      const searchRecord = searchRecordResult[0];

      const recordsCreated: IWebSearchResult[] = [];
      for (const result of results) {
        const response = await WebSearch.findOrCreateResult(result);
        if (!response) {
          console.error("Something went wrong finding and creating record");
          continue;
        }
        const { record, isNew } = response;
        if (record) {
          if (isNew) {
            db.query("RELATE $webSearch->found->$webResult", {
              webSearch: new StringRecordId(searchRecord.id),
              webResult: new StringRecordId(record.id),
            });
          }
          recordsCreated.push(record);
        }
      }

      return searchRecord;
    } catch (error) {
      console.error("Error created search result record");
      return undefined;
    }
  }

  public static async findOrCreateResult(
    form: IWebSearchResultForm,
  ): Promise<{ isNew: boolean; record: IWebSearchResult } | undefined> {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Couldn't get database");
      }
      const identifier = form.item.id.toString();
      const result = await db.query<[IWebSearchResult]>(
        "SELECT * FROM web_result WHERE item.id = $identifier;",
        {
          identifier,
        },
      );
      if (result.length > 0) {
        return { isNew: false, record: result[0] };
      }
      const r = await db.create<IWebSearchResult, IWebSearchResultCreator>(
        "web_result",
        {
          ...form,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      );
      const record = r[0];
      return { isNew: true, record };
    } catch (error) {
      console.error("Error finding or creating result: ", error);
      return undefined;
    }
  }

  public static async get(webSearchId: string | RecordId) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Coudln't get database");
      }
      const result = await db.run<IWebSearch>("fn::get_web_search_record", [
        new StringRecordId(webSearchId),
      ]);
      if (!result) {
        throw new Error(
          "Couldn't get web search record with id: " + webSearchId.toString(),
        );
      }
      return result;
    } catch (error) {
      console.error("Error getting web result record: ", error);
      return undefined;
    }
  }
}
