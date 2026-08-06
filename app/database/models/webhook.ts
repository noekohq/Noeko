import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { StringRecordId } from "surrealdb";
import type { DomainEvent, Webhook, WebhookDelivery } from "../../../shared/types/automation";
import { getDatabase } from "../db";

const encryptionKey = createHash("sha256")
  .update(process.env.TOKEN_SECRET ?? "")
  .digest();

const encrypt = (value: string) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
};

export const decryptWebhookSecret = (value: string) => {
  const [iv, tag, encrypted] = value.split(".");
  if (!iv || !tag || !encrypted) throw new Error("Invalid encrypted webhook secret");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey, Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64url")),
    decipher.final(),
  ]).toString("utf8");
};

export class WebhookModel {
  static async create(userId: string, url: string, events: string[]) {
    const db = await getDatabase();
    if (!db) throw new Error("Database connection not available");
    const secret = `whsec_${randomBytes(32).toString("base64url")}`;
    const now = new Date();
    const [webhook] = await db.create<Webhook, Omit<Webhook, "id">>("webhook", {
      userId: new StringRecordId(userId),
      url,
      events,
      encryptedSecret: encrypt(secret),
      enabled: true,
      consecutiveFailures: 0,
      createdAt: now,
      updatedAt: now,
    });
    if (!webhook) throw new Error("Failed to create webhook");
    return { webhook, secret };
  }

  static async listForUser(userId: string): Promise<Webhook[]> {
    const db = await getDatabase();
    if (!db) throw new Error("Database connection not available");
    const [rows = []] = await db.query<[Webhook[]]>(
      `SELECT * OMIT encryptedSecret FROM webhook WHERE userId = $userId ORDER BY createdAt DESC;`,
      { userId: new StringRecordId(userId) }
    );
    return rows;
  }

  static async getOwned(id: string, userId: string): Promise<Webhook | null> {
    const db = await getDatabase();
    if (!db) throw new Error("Database connection not available");
    const [rows = []] = await db.query<[Webhook[]]>(
      `SELECT * OMIT encryptedSecret FROM webhook WHERE id = $id AND userId = $userId LIMIT 1;`,
      { id: new StringRecordId(id), userId: new StringRecordId(userId) }
    );
    return rows[0] ?? null;
  }

  static async updateOwned(
    id: string,
    userId: string,
    update: Partial<Pick<Webhook, "url" | "events" | "enabled">>
  ): Promise<Webhook | null> {
    const db = await getDatabase();
    if (!db) throw new Error("Database connection not available");
    const [rows = []] = await db.query<[Webhook[]]>(
      `UPDATE $id MERGE $update WHERE userId = $userId RETURN AFTER;`,
      {
        id: new StringRecordId(id),
        userId: new StringRecordId(userId),
        update: { ...update, updatedAt: new Date() },
      }
    );
    return rows[0] ?? null;
  }

  static async deleteOwned(id: string, userId: string): Promise<boolean> {
    const db = await getDatabase();
    if (!db) throw new Error("Database connection not available");
    if (!(await this.getOwned(id, userId))) return false;
    const recordId = new StringRecordId(id);
    await db.query(
      `DELETE webhook_delivery WHERE webhookId = $id;
       DELETE $id;`,
      { id: recordId }
    );
    return true;
  }

  static async findMatching(event: DomainEvent): Promise<Webhook[]> {
    const db = await getDatabase();
    if (!db) throw new Error("Database connection not available");
    const [rows = []] = await db.query<[Webhook[]]>(
      `SELECT * FROM webhook WHERE userId = $userId AND enabled = true
       AND ($eventType IN events OR "*" IN events);`,
      { userId: event.userId, eventType: event.type }
    );
    return rows;
  }

  static async recordSuccess(id: string) {
    const db = await getDatabase();
    if (!db) throw new Error("Database connection not available");
    await db.merge(new StringRecordId(id), { consecutiveFailures: 0, updatedAt: new Date() });
  }

  static async recordFailure(id: string, disableAfter = 10) {
    const db = await getDatabase();
    if (!db) throw new Error("Database connection not available");
    await db.query(
      `UPDATE $id SET consecutiveFailures += 1, updatedAt = time::now();
       UPDATE $id SET enabled = false, disabledAt = time::now()
       WHERE consecutiveFailures >= $disableAfter;`,
      { id: new StringRecordId(id), disableAfter }
    );
  }
}

export class WebhookDeliveryModel {
  static async create(webhookId: string, eventId: string) {
    const db = await getDatabase();
    if (!db) throw new Error("Database connection not available");
    const webhookRecordId = new StringRecordId(webhookId);
    const eventRecordId = new StringRecordId(eventId);
    const [existing = []] = await db.query<[WebhookDelivery[]]>(
      `SELECT * FROM webhook_delivery WHERE webhookId = $webhookId AND eventId = $eventId LIMIT 1;`,
      { webhookId: webhookRecordId, eventId: eventRecordId }
    );
    if (existing.length > 0) return existing[0];
    const now = new Date();
    await db.query(
      `CREATE webhook_delivery CONTENT {
        webhookId: $webhookId, eventId: $eventId, status: "pending", attempt: 0,
        nextAttemptAt: $now, createdAt: $now, updatedAt: $now
      };`,
      {
        webhookId: webhookRecordId,
        eventId: eventRecordId,
        now,
      }
    );
  }

  static async findClaimable(limit = 25): Promise<WebhookDelivery[]> {
    const db = await getDatabase();
    if (!db) throw new Error("Database connection not available");
    const [rows = []] = await db.query<[WebhookDelivery[]]>(
      `SELECT * FROM webhook_delivery
       WHERE (status = "pending" OR (status = "delivering" AND leaseExpiresAt < time::now()))
         AND nextAttemptAt <= time::now()
       ORDER BY nextAttemptAt ASC LIMIT $limit;`,
      { limit }
    );
    return rows;
  }

  static async claim(id: string, workerId: string, leaseExpiresAt: Date) {
    const db = await getDatabase();
    if (!db) throw new Error("Database connection not available");
    const [rows = []] = await db.query<[WebhookDelivery[]]>(
      `UPDATE $id SET status = "delivering", leaseOwner = $workerId,
       leaseExpiresAt = $leaseExpiresAt, attempt += 1, updatedAt = time::now()
       WHERE status = "pending" OR (status = "delivering" AND leaseExpiresAt < time::now())
       RETURN AFTER;`,
      { id: new StringRecordId(id), workerId, leaseExpiresAt }
    );
    return rows[0] ?? null;
  }

  static async getDependencies(delivery: WebhookDelivery) {
    const db = await getDatabase();
    if (!db) throw new Error("Database connection not available");
    const webhook = await db.select<Webhook>(delivery.webhookId);
    const event = await db.select<DomainEvent>(delivery.eventId);
    return { webhook, event };
  }

  static async succeed(id: string, responseStatus: number) {
    const db = await getDatabase();
    if (!db) throw new Error("Database connection not available");
    await db.merge(new StringRecordId(id), {
      status: "succeeded",
      responseStatus,
      deliveredAt: new Date(),
      updatedAt: new Date(),
      leaseOwner: undefined,
      leaseExpiresAt: undefined,
      error: undefined,
    });
  }

  static async retry(
    id: string,
    error: string,
    responseStatus: number | undefined,
    attempt: number
  ) {
    const db = await getDatabase();
    if (!db) throw new Error("Database connection not available");
    const permanentlyFailed = attempt >= 10;
    const delayMs = Math.min(60 * 60_000, 1_000 * 2 ** Math.min(attempt, 12));
    await db.merge(new StringRecordId(id), {
      status: permanentlyFailed ? "failed" : "pending",
      error: error.slice(0, 500),
      ...(responseStatus ? { responseStatus } : {}),
      nextAttemptAt: new Date(Date.now() + delayMs + Math.floor(Math.random() * 1_000)),
      updatedAt: new Date(),
      leaseOwner: undefined,
      leaseExpiresAt: undefined,
    });
  }

  static async listForWebhook(webhookId: string, limit = 50): Promise<WebhookDelivery[]> {
    const db = await getDatabase();
    if (!db) throw new Error("Database connection not available");
    const [rows = []] = await db.query<[WebhookDelivery[]]>(
      `SELECT * FROM webhook_delivery WHERE webhookId = $webhookId
       ORDER BY createdAt DESC LIMIT $limit;`,
      { webhookId: new StringRecordId(webhookId), limit }
    );
    return rows;
  }
}
