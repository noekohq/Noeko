import { RecordId, StringRecordId } from "surrealdb";
import { Connectable, IConnectable } from "../../services/Graph";
import { getDatabase } from "../db";
import { IFriendUser, IPublicUser } from "../../../shared/types/user";

export type ISharedThing = IConnectable & {
  owner: IFriendUser;
  users: IFriendUser[];
  accessLevel: IShareAccess;
  sharedAt: Date;
};

export type IShareAccess = "viewonly" | "editor" | "owner";

export type IShareDetails = {
  user: IPublicUser;
  accessLevel: IShareAccess;
};

export type IShare = {
  id: string;
  in: string;
  out: string;
  accessLevel: IShareAccess;
};

type ISharedThingsQueryResult = {
  thing: IConnectable;
  sharedAt: Date;
  accessLevel: string;
  owner: {
    id: string;
    firstName: string;
    lastName: string;
    createdAt: Date;
  };
  users: {
    id: string;
    firstName: string;
    lastName: string;
    createdAt: Date;
  }[];
};

export class Share {
  private _connectableId: StringRecordId;
  private _connectable: Connectable;

  constructor(connectableId: string | RecordId) {
    this._connectableId = new StringRecordId(connectableId);
    this._connectable = new Connectable(connectableId);

    const allowedTypes = ["idea", "task"];
    if (!allowedTypes.includes(this._connectable.type)) {
      throw new Error(
        `Only ${allowedTypes.join(
          ", ",
        )} can currently be shared, other types not yet supported.`,
      );
    }
  }

  get connectableId(): StringRecordId {
    return this._connectableId;
  }

  async shareAccess(userId: string, accessLevel: IShareAccess = "viewonly") {
    try {
      const db = await getDatabase();

      const existing = await db?.query<[IShare[]]>(
        `SELECT * FROM shared_with WHERE in = $connectableId AND out = $userId`,
        {
          connectableId: this.connectableId,
          userId: new StringRecordId(userId),
        },
      );

      if (existing && existing[0] && existing[0].length > 0) {
        return true;
      }

      const query = `
          RELATE $connectableId->shared_with->$userId CONTENT {
            accessLevel: $accessLevel,
            createdAt: $now,
          };
        `;

      const result = await db?.query<[IShare[]]>(query, {
        connectableId: this.connectableId,
        userId: new StringRecordId(userId),
        accessLevel,
        now: new Date(),
      });
      return !!(result && result[0] && result[0].length > 0);
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  async revokeAccess(userId: string) {
    const query = `
      DELETE FROM shared_with
      WHERE
        out = $userId AND
        in = $connectableId
    `;

    try {
      const db = await getDatabase();
      const result = await db?.query<[IShare[]]>(query, {
        connectableId: this.connectableId,
        userId: new StringRecordId(userId),
      });
      return !!(result && result[0] && result[0].length > 0);
    } catch (e) {
      console.error("Couldn't revoke access", e);
      return false;
    }
  }

  async updateAccess(userId: string, accessLevel: IShareAccess) {
    try {
      const db = await getDatabase();
      if (!db) throw new Error("Database not available");
      const update = await db.query<[IShare[]]>(
        `
        UPDATE shared_with
        MERGE { accessLevel: $accessLevel }
        WHERE
          out = $userId AND
          in = $connectableId
      `,
        {
          connectableId: this.connectableId,
          userId: new StringRecordId(userId),
          accessLevel,
        },
      );
      if (!update || !update[0] || update[0].length === 0) {
        throw new Error("Share not found");
      }
      const share = update[0][0];
      return share;
    } catch (e) {
      console.error("Error updating access", e);
      return false;
    }
  }

  static async getShares(
    connectableId: string | RecordId,
  ): Promise<IShareDetails[] | undefined> {
    try {
      const query = `
        SELECT
            out.* as user,
            accessLevel
        FROM shared_with
        WHERE
            in = $connectableId
      `;

      const db = await getDatabase();
      if (!db) throw new Error("Database not available");

      const result = await db.query<[IShareDetails[]]>(query, {
        connectableId: new StringRecordId(connectableId),
      });

      if (!result || !result[0]) {
        return [];
      }

      const shares = result[0];
      return shares;
    } catch (error) {
      console.error("Error getting shares", error);
      return undefined;
    }
  }

  static async getUserSharedThings(
    userId: string | RecordId,
  ): Promise<ISharedThing[] | undefined> {
    try {
      const db = await getDatabase();
      const query = `
          SELECT
              *,
              -- 1. Fetch Owner
              (<-owns<-user)[0].{ id, firstName, lastName, email, createdAt } AS owner,

              -- 2. Fetch All Recipients
              (
                  SELECT
                      id,
                      firstName,
                      lastName,
                      email,
                      createdAt
                  FROM ->shared_with->user
              ) AS users,

              -- 3. Calculate Access Level
              (
                  IF (<-owns<-user)[0].id == $userId THEN
                      'owner'
                  ELSE
                      -- Find the specific edge for this user to get their permission
                      (SELECT VALUE accessLevel FROM shared_with WHERE in = $parent.id AND out = $userId)[0]
                  END
              ) AS accessLevel,

              (
                  IF (<-owns<-user)[0].id == $userId THEN
                      createdAt
                  ELSE
                      (SELECT VALUE createdAt FROM shared_with WHERE in = $parent.id AND out = $userId)[0]
                  END
              ) AS sharedAt

          OMIT embeddings, yState
          FROM array::distinct(array::union(
              (SELECT VALUE in FROM shared_with WHERE out = $userId),

              (SELECT VALUE out FROM owns WHERE in = $userId AND array::len(out->shared_with) > 0)
          ));
        `;

      const result = await db?.query<[ISharedThing[]]>(query, {
        userId: new StringRecordId(userId),
      });

      if (!result || !result[0]) {
        throw new Error("Couldn't fetch shared things");
      }

      return result[0].map((item) => {
        const c = new Connectable(item.id);
        return {
          ...item,
          type: c.type,
          sharedAt: new Date(item.sharedAt),
        } as ISharedThing;
      });
    } catch (error) {
      console.error("Error fetching shared things", error);
      return undefined;
    }
  }
}
