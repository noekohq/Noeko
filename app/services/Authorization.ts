import { RecordId, StringRecordId } from "surrealdb";
import { getDatabase } from "../database/db";
import { IShareAccess } from "../database/models/share";
import { User } from "../database/models/user";

export default class Authorization {
  private _userId: string | RecordId | StringRecordId;

  constructor(userId: string | RecordId | StringRecordId) {
    this._userId = userId;
  }

  get userId(): string {
    return this._userId.toString();
  }

  async user() {
    return await User.get(this.userId);
  }

  async owns(thingId: string | RecordId) {
    return await Authorization.checkOwns(this.userId, thingId);
  }

  async hasAccess(thingId: string | RecordId, requiredAccess?: IShareAccess) {
    return await Authorization.checkHasAccess(
      this.userId,
      thingId,
      requiredAccess,
    );
  }

  static async getAccessLevel(
    userId: string | RecordId,
    thingId: string | RecordId,
  ): Promise<"owner" | IShareAccess | null> {
    try {
      const isOwner = await this.checkOwns(userId, thingId);
      if (isOwner) {
        return "owner";
      }

      const sharedAccessLevel = await this.getSharedAccessLevel(
        thingId,
        userId,
      );
      if (sharedAccessLevel) {
        return sharedAccessLevel;
      }

      if (thingId.toString().startsWith("user_file")) {
        const hasEmbeddedAccess = await this.hasEmbeddedAccess(
          thingId,
          userId,
          "viewonly",
        );
        if (hasEmbeddedAccess) {
          return "viewonly";
        }
      }

      const hasConnectedAccess = await this.hasConnectedAccess(
        thingId,
        userId,
        "viewonly",
      );
      if (hasConnectedAccess) {
        return "viewonly";
      }

      return null;
    } catch (error) {
      console.error(
        "Error getting user access level: ",
        userId,
        thingId,
        error,
      );
      return null;
    }
  }

  static async checkOwns(
    userId: string | RecordId,
    thingId: string | RecordId,
  ) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Database not available.");
      }
      const results = await db.query<[number]>(
        `count(SELECT VALUE id FROM owns WHERE in = $userId AND out = $thingId)`,
        {
          userId: new StringRecordId(userId),
          thingId: new StringRecordId(thingId),
        },
      );
      if (!results) {
        throw new Error("No results for ownership check");
      }
      const owns = results[0] > 0;
      return owns;
    } catch (error) {
      console.error("Error checking user owns: ", userId, thingId, error);
      return undefined;
    }
  }

  static async checkHasAccess(
    userId: string | RecordId,
    thingId: string | RecordId,
    requiredAccess?: "owner" | IShareAccess,
  ) {
    try {
      const isOwner = await Authorization.checkOwns(userId, thingId);
      if (isOwner) {
        return true;
      }
      if (requiredAccess === "owner") {
        return false;
      }

      const hasSharedAccess = await this.hasSharedAccess(
        thingId,
        userId,
        requiredAccess,
      );
      if (hasSharedAccess) {
        return true;
      }

      if (thingId.toString().startsWith("user_file")) {
        const hasEmbeddedAccess = await this.hasEmbeddedAccess(
          thingId,
          userId,
          requiredAccess,
        );
        return hasEmbeddedAccess;
      }

      const hasConnectedAccess = await this.hasConnectedAccess(
        thingId,
        userId,
        requiredAccess,
      );
      if (hasConnectedAccess) {
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error checking user has access: ", userId, thingId, error);
      return undefined;
    }
  }

  static async getSharedAccessLevel(
    thingId: string | RecordId,
    userId: string | RecordId,
  ): Promise<IShareAccess | null> {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Database not available.");
      }
      const query = `SELECT VALUE accessLevel FROM shared_with WHERE in = $thingId AND out = $userId LIMIT 1`;
      const results = await db.query<[IShareAccess[]]>(query, {
        userId: new StringRecordId(userId),
        thingId: new StringRecordId(thingId),
      });

      if (!results || !results[0] || !results[0][0]) {
        return null;
      }

      return results[0][0];
    } catch (error) {
      console.error("Error checking user access: ", userId, thingId, error);
      return null;
    }
  }

  static async hasSharedAccess(
    thingId: string | RecordId,
    userId: string | RecordId,
    requiredAccess?: IShareAccess,
  ) {
    try {
      const sharedAccessLevel = await this.getSharedAccessLevel(
        thingId,
        userId,
      );
      if (!sharedAccessLevel) {
        return false;
      }

      if (!requiredAccess) {
        return true;
      }

      if (requiredAccess === "viewonly") {
        return (
          sharedAccessLevel === "viewonly" || sharedAccessLevel === "editor"
        );
      }

      if (requiredAccess === "editor") {
        return sharedAccessLevel === "editor";
      }

      return false;
    } catch (error) {
      console.error("Error checking user access: ", userId, thingId, error);
      return undefined;
    }
  }

  static async hasConnectedAccess(
    thingId: string | RecordId,
    userId: string | RecordId,
    requiredAccess?: IShareAccess,
  ) {
    try {
      if (requiredAccess === "editor") {
        return false;
      }

      const db = await getDatabase();
      if (!db) throw new Error("Database not available.");

      const proxyAccessFilter = `(accessLevel = 'viewonly' OR accessLevel = 'editor')`;

      const query = `
          SELECT count(
            (->connected.out + <-connected.in)[
               WHERE
                 -- Path A: User owns the neighbor
                 (<-owns.in CONTAINS $userId)
                 OR
                 -- Path B: Neighbor is shared with user
                 (count(->shared_with[WHERE out = $userId AND ${proxyAccessFilter}]) > 0)
            ]
          ) > 0 AS accessible
          FROM $thingId;
        `;

      const results = await db.query<[{ accessible: boolean }]>(query, {
        userId: new StringRecordId(userId),
        thingId: new StringRecordId(thingId),
      });

      return !!results?.[0]?.accessible;
    } catch (error) {
      console.error(
        "Error checking connected access: ",
        userId,
        thingId,
        error,
      );
      return false;
    }
  }

  static async hasEmbeddedAccess(
    thingId: string | RecordId,
    userId: string | RecordId,
    requiredAccess?: IShareAccess,
  ) {
    try {
      const db = await getDatabase();
      if (!db) throw new Error("Database not available.");

      let accessFilter = "";
      if (requiredAccess === "editor") {
        accessFilter = `accessLevel = 'editor'`;
      } else {
        accessFilter = `(accessLevel = 'viewonly' OR accessLevel = 'editor')`;
      }

      const query = `
          SELECT count(
            ->embedded_within.out[
               WHERE
                 -- Path A: User owns the container
                 (<-owns.in CONTAINS $userId)
                 OR
                 -- Path B: Container is shared with user
                 -- FIX: Added 'AND' before the ${accessFilter}
                 (count(->shared_with[WHERE out = $userId AND ${accessFilter}]) > 0)
            ]
          ) > 0 AS accessible
          FROM $thingId;
        `;

      const results = await db.query<[{ accessible: boolean }[]]>(query, {
        userId: new StringRecordId(userId),
        thingId: new StringRecordId(thingId),
      });

      return !!results?.[0]?.[0]?.accessible;
    } catch (error) {
      console.error("Error checking embedded access: ", userId, thingId, error);
      return false;
    }
  }

  async hasAccessBulk(
    thingIds: (string | RecordId)[],
    requiredAccess?: IShareAccess,
  ) {
    return await Authorization.checkHasAccessBulk(
      this.userId,
      thingIds,
      requiredAccess,
    );
  }

  /**
   * Efficiently checks access permissions for multiple items at once.
   * @returns A Set of IDs that the user is authorized to access.
   */
  static async checkHasAccessBulk(
    userId: string | RecordId,
    thingIds: (string | RecordId)[],
    requiredAccess?: "owner" | IShareAccess,
  ): Promise<Set<string>> {
    try {
      if (!thingIds || thingIds.length === 0) return new Set();

      const db = await getDatabase();
      if (!db) throw new Error("Database not available.");

      // 1. Setup Access Filters
      let accessFilter = "";
      if (requiredAccess === "editor") {
        accessFilter = `AND accessLevel = 'editor'`;
      } else {
        // 'viewonly' (or undefined) implies read access, so either viewonly or editor works
        accessFilter = `AND (accessLevel = 'viewonly' OR accessLevel = 'editor')`;
      }

      const formattedIds = thingIds.map((id) => new StringRecordId(id));
      const formattedUserId = new StringRecordId(userId);

      let query = "";

      if (requiredAccess === "owner") {
        query = `
            SELECT VALUE id FROM $ids
            WHERE (<-owns.in CONTAINS $userId)
          `;
      } else {
        query = `
            SELECT VALUE id FROM $ids
            WHERE
              -- A. Direct Ownership
              (<-owns.in CONTAINS $userId)
              OR
              -- B. Direct Sharing
              (count(->shared_with[WHERE out = $userId ${accessFilter}]) > 0)
              OR
              -- C. Transitive/Embedded Access (The "Proxy" Check)
              -- Checks if this item is embedded in a container that the user has access to
              (count(
                ->embedded_within.in[
                    WHERE
                    (<-owns.in CONTAINS $userId)
                    OR
                    (count(->shared_with[WHERE out = $userId ${accessFilter}]) > 0)
                ]
              ) > 0)
          `;
      }

      const [allowedIds] = await db.query<[string[]]>(query, {
        ids: formattedIds,
        userId: formattedUserId,
      });

      return new Set(allowedIds?.map((id) => id.toString()) || []);
    } catch (error) {
      console.error("Error checking bulk access:", error);
      return new Set();
    }
  }
}
