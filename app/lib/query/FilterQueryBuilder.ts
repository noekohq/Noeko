import { RecordId, StringRecordId } from "surrealdb";
import {
  IGraphFilters,
  IGraphTagFilter,
} from "../../../shared/types/constellation";

export class FilterQueryBuilder {
  private whereClauses: string[] = [];
  private params: Record<string, any> = {};
  private sortClause = "";
  private limitClause = "";

  constructor() {} // Start with a clean slate

  /**
   * Adds a filter to ensure items are accessible by the specified user.
   * Mirrors Authorization.ts logic.
   */
  public withAccess(userId: string | RecordId, includeShared = false): this {
    if (includeShared) {
      this.whereClauses.push(
        `(<-owns.in CONTAINS $userId OR count(->shared_with[WHERE out = $userId]) > 0)`,
      );
    } else {
      this.whereClauses.push(`<-owns.in CONTAINS $userId`);
    }
    this.params.userId = new StringRecordId(userId);
    return this;
  }

  /**
   * Adds a filter to ensure all items are owned by the specified user.
   */
  public ownedBy(userId: string | RecordId): this {
    return this.withAccess(userId, false);
  }

  /**
   * Adds a date-based filter for a specific field.
   * @param field The database field name (e.g., 'createdAt', 'updatedAt').
   * @param options An object with optional 'before' and 'after' date strings.
   */
  public withDateRange(
    field: "createdAt" | "updatedAt" | "viewedAt",
    options: { after?: string; before?: string },
  ): this {
    const { after, before } = options;
    const afterDate = after ? new Date(after) : null;
    const beforeDate = before ? new Date(before) : null;

    if (
      afterDate &&
      !isNaN(afterDate.getTime()) &&
      beforeDate &&
      !isNaN(beforeDate.getTime())
    ) {
      this.whereClauses.push(
        `${field} >= $${field}After AND ${field} <= $${field}Before`,
      );
      this.params[`${field}After`] = afterDate;
      this.params[`${field}Before`] = beforeDate;
    } else if (afterDate && !isNaN(afterDate.getTime())) {
      this.whereClauses.push(`${field} > $${field}After`);
      this.params[`${field}After`] = afterDate;
    } else if (beforeDate && !isNaN(beforeDate.getTime())) {
      this.whereClauses.push(`${field} < $${field}Before`);
      this.params[`${field}Before`] = beforeDate;
    }
    return this; // Return 'this' to allow chaining
  }

  /**
   * Adds the rabbithole filter.
   */
  public inRabbithole(rabbitholeId: string | RecordId): this {
    const clause = `
      (
        id IN (SELECT VALUE ->includes.out FROM ONLY <record>$rabbitholeId) OR
        id IN (SELECT VALUE ->includes->tag->describes.out FROM ONLY <record>$rabbitholeId)
      )
    `;
    this.whereClauses.push(clause);
    this.params.rabbitholeId = new StringRecordId(rabbitholeId);
    return this;
  }

  public sortBy(field: string, direction: "ASC" | "DESC" = "DESC"): this {
    this.sortClause = `ORDER BY ${field} ${direction}`;
    return this;
  }

  public limit(count: number): this {
    this.limitClause = `LIMIT ${count}`;
    return this;
  }

  public withCursor(cursor: string, field: string = "updatedAt"): this {
    this.whereClauses.push(`${field} < $cursor`);
    this.params.cursor = new Date(cursor);
    return this;
  }

  public withTags(filter: IGraphTagFilter): this {
    const { set, behavior } = filter;
    if (!set.length) {
      return this;
    }

    switch (behavior) {
      case "and":
        this.whereClauses.push(
          `array::len(<-describes<-(tag WHERE id in $tagSet)) = array::len($tagSet)`,
        );
        break;
      case "or":
        this.whereClauses.push(`<-describes<-(tag WHERE id IN $tagSet)`);
        break;
    }

    this.params.tagSet = set.map(
      (s: string | RecordId) => new StringRecordId(s),
    );

    return this;
  }

  public applyFilters(
    filters: IGraphFilters,
    userId?: string | RecordId,
  ): this {
    if (userId) {
      this.withAccess(userId, !!filters.showShared);
    }
    if (filters.date?.createdAt) {
      this.withDateRange("createdAt", filters.date.createdAt);
    }
    if (filters.date?.updatedAt) {
      this.withDateRange("updatedAt", filters.date.updatedAt);
    }
    if (filters.date?.viewedAt) {
      this.withDateRange("viewedAt", filters.date.viewedAt);
    }
    if (filters.rabbithole) {
      this.inRabbithole(filters.rabbithole);
    }
    if (filters.tags) {
      this.withTags(filters.tags);
    }
    return this;
  }

  /**
   * Finalizes the chain and returns the generated clauses and parameters.
   */
  public build(): { where: string[]; params: Record<string, any> } {
    return {
      where: this.whereClauses,
      params: this.params,
    };
  }

  public buildQueryParts(): {
    where: string[];
    params: Record<string, any>;
    sort: string;
    limit: string;
  } {
    return {
      where: this.whereClauses,
      params: this.params,
      sort: this.sortClause,
      limit: this.limitClause,
    };
  }
}
