import { StringRecordId } from "surrealdb";
import type { ActorContext, DomainEvent, DomainEventType } from "../../../shared/types/automation";
import { getDatabase } from "../db";

type CreateDomainEvent = {
  type: DomainEventType;
  actor: ActorContext;
  resourceType: string;
  resourceId: string;
  data?: Record<string, unknown>;
};

export class DomainEventModel {
  static async create(input: CreateDomainEvent): Promise<DomainEvent> {
    const db = await getDatabase();
    if (!db) throw new Error("Database connection not available");
    const [event] = await db.create<DomainEvent, Omit<DomainEvent, "id">>("domain_event", {
      type: input.type,
      version: 1,
      userId: new StringRecordId(input.actor.userId),
      actorType: input.actor.type,
      ...(input.actor.actorId ? { actorId: input.actor.actorId } : {}),
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      data: input.data ?? {},
      status: "pending",
      attempt: 0,
      createdAt: new Date(),
    });
    if (!event) throw new Error("Failed to persist domain event");
    return event;
  }

  static async findClaimable(limit = 25): Promise<DomainEvent[]> {
    const db = await getDatabase();
    if (!db) throw new Error("Database connection not available");
    const [events = []] = await db.query<[DomainEvent[]]>(
      `SELECT * FROM domain_event
       WHERE status = "pending"
          OR (status = "processing" AND leaseExpiresAt < time::now())
       ORDER BY createdAt ASC LIMIT $limit;`,
      { limit }
    );
    return events;
  }

  static async claim(id: string, workerId: string, leaseExpiresAt: Date) {
    const db = await getDatabase();
    if (!db) throw new Error("Database connection not available");
    const [events = []] = await db.query<[DomainEvent[]]>(
      `UPDATE $id SET status = "processing", leaseOwner = $workerId,
         leaseExpiresAt = $leaseExpiresAt, attempt += 1
       WHERE status = "pending"
          OR (status = "processing" AND leaseExpiresAt < time::now())
       RETURN AFTER;`,
      { id: new StringRecordId(id), workerId, leaseExpiresAt }
    );
    return events[0] ?? null;
  }

  static async markDispatched(id: string) {
    const db = await getDatabase();
    if (!db) throw new Error("Database connection not available");
    await db.query(
      `UPDATE $id SET status = "dispatched", dispatchedAt = time::now(),
       leaseOwner = NONE, leaseExpiresAt = NONE;`,
      { id: new StringRecordId(id) }
    );
  }

  static async release(id: string) {
    const db = await getDatabase();
    if (!db) throw new Error("Database connection not available");
    await db.query(`UPDATE $id SET status = "pending", leaseOwner = NONE, leaseExpiresAt = NONE;`, {
      id: new StringRecordId(id),
    });
  }

  static async get(id: string): Promise<DomainEvent | null> {
    const db = await getDatabase();
    if (!db) throw new Error("Database connection not available");
    return (await db.select<DomainEvent>(new StringRecordId(id))) ?? null;
  }
}
