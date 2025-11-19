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

  static async hasSharedAccess(
    thingId: string | RecordId,
    userId: string | RecordId,
    requiredAccess?: IShareAccess,
  ) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Database not available.");
      }
      // We check the edge 'shared_with' connecting Thing -> User
      const query = `SELECT VALUE accessLevel FROM shared_with WHERE in = $thingId AND out = $userId LIMIT 1`;
      const results = await db.query<[IShareAccess[]]>(query, {
        userId: new StringRecordId(userId),
        thingId: new StringRecordId(thingId),
      });

      if (!results || !results[0] || !results[0][0]) {
        return false;
      }

      const sharedAccessLevel = results[0][0];
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

  /**
   * Checks if the item is connected (neighbor) to an item the user has access to.
   * Path: Item <-> connected_to <-> Neighbor -> (owns OR shared_with) -> User
   * Constraint: Connected access is strictly VIEWONLY.
   */
  static async hasConnectedAccess(
    thingId: string | RecordId,
    userId: string | RecordId,
    requiredAccess?: IShareAccess,
  ) {
    try {
      // 1. Constraint: Connected access never grants 'editor' permissions.
      if (requiredAccess === "editor") {
        return false;
      }

      const db = await getDatabase();
      if (!db) throw new Error("Database not available.");

      // 2. The neighbor (proxy) must be accessible to the user (either viewonly or editor)
      const proxyAccessFilter = `(accessLevel = 'viewonly' OR accessLevel = 'editor')`;

      // 3. The Query
      // We start at the Thing ($thingId).
      // We look at all neighbors (outgoing or incoming connections).
      // We filter those neighbors: Do we own them? OR Are they shared with us?
      // If count > 0, we have access.
      const query = `
          SELECT count(
            (->connected_to.out + <-connected_to.in)[
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

  /**
   * Checks if the user has access to a parent container that this item is embedded within.
   * Path: Item -> embedded_within -> Container -> (owns OR shared_with) -> User
   */
  static async hasEmbeddedAccess(
    thingId: string | RecordId,
    userId: string | RecordId,
    requiredAccess?: IShareAccess,
  ) {
    try {
      const db = await getDatabase();
      if (!db) throw new Error("Database not available.");

      // define the filter WITHOUT the 'AND' prefix
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

      // 2. The Bulk Query
      // We select from the input array ($ids).
      // For each ID, we check if it meets ANY of the 3 criteria.
      let query = "";

      if (requiredAccess === "owner") {
        // Strict ownership check
        query = `
            SELECT VALUE id FROM $ids
            WHERE (<-owns.in CONTAINS $userId)
          `;
      } else {
        // Standard access check (Owns OR Direct Share OR Transitive/Embedded Share)
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

      // Return a Set of strings for fast O(1) lookups
      return new Set(allowedIds?.map((id) => id.toString()) || []);
    } catch (error) {
      console.error("Error checking bulk access:", error);
      // Fail safe: return empty set if DB error
      return new Set();
    }
  }
}
