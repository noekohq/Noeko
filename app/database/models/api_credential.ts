import { createHash, randomBytes } from "node:crypto";
import { StringRecordId } from "surrealdb";
import type { ApiCredential, ApiScope } from "../../../shared/types/automation";
import { getDatabase } from "../db";

const hashSecret = (secret: string) => createHash("sha256").update(secret).digest("hex");

export class ApiCredentialModel {
  static async create(userId: string, name: string, scopes: ApiScope[], expiresAt?: Date) {
    const db = await getDatabase();
    if (!db) throw new Error("Database connection not available");

    const secret = `noeko_live_${randomBytes(32).toString("base64url")}`;
    const prefix = secret.slice(0, 18);
    const [credential] = await db.create<ApiCredential, Omit<ApiCredential, "id">>(
      "api_credential",
      {
        userId: new StringRecordId(userId),
        name,
        prefix,
        secretHash: hashSecret(secret),
        scopes,
        createdAt: new Date(),
        ...(expiresAt ? { expiresAt } : {}),
      }
    );
    if (!credential) throw new Error("Failed to create API credential");
    return { credential, secret };
  }

  static async authenticate(secret: string): Promise<ApiCredential | null> {
    const db = await getDatabase();
    if (!db) throw new Error("Database connection not available");
    const [rows = []] = await db.query<[ApiCredential[]]>(
      `SELECT * FROM api_credential
       WHERE secretHash = $secretHash
         AND revokedAt = NONE
         AND (expiresAt = NONE OR expiresAt > time::now())
       LIMIT 1;`,
      { secretHash: hashSecret(secret) }
    );
    const credential = rows[0];
    if (!credential) return null;
    void db.merge(credential.id, { lastUsedAt: new Date() });
    return credential;
  }

  static async listForUser(userId: string): Promise<ApiCredential[]> {
    const db = await getDatabase();
    if (!db) throw new Error("Database connection not available");
    const [rows = []] = await db.query<[ApiCredential[]]>(
      `SELECT * OMIT secretHash FROM api_credential
       WHERE userId = $userId ORDER BY createdAt DESC;`,
      { userId: new StringRecordId(userId) }
    );
    return rows;
  }

  static async revoke(id: string, userId: string): Promise<boolean> {
    const db = await getDatabase();
    if (!db) throw new Error("Database connection not available");
    const [rows = []] = await db.query<[ApiCredential[]]>(
      `UPDATE $id SET revokedAt = time::now()
       WHERE userId = $userId AND revokedAt = NONE RETURN AFTER;`,
      { id: new StringRecordId(id), userId: new StringRecordId(userId) }
    );
    return rows.length === 1;
  }
}
