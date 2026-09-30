import { RecordId, RecordIdRange, StringRecordId, Surreal, Table } from "surrealdb";

type LegacyResource = string | RecordId | RecordIdRange | StringRecordId | Table;

type LegacyCrud = {
  select<T>(resource: RecordId | StringRecordId): Promise<T | undefined>;
  select<T>(resource: string | RecordIdRange | Table): Promise<T[]>;
  select<T>(resource: LegacyResource): Promise<T | T[] | undefined>;
  create<I>(resource: LegacyResource, data: I): Promise<(I & { id: RecordId })[]>;
  create<T, I = T>(resource: LegacyResource, data?: I): Promise<T[]>;
  insert<I>(resource: LegacyResource, data: I | I[]): Promise<(I & { id: RecordId })[]>;
  insert<T, I = T>(resource: LegacyResource, data: I | I[]): Promise<T[]>;
  update<T, I = T>(resource: LegacyResource, data: I): Promise<T>;
  merge<T, I = Partial<T>>(resource: LegacyResource, data: I): Promise<T>;
  upsert<T, I = T>(resource: LegacyResource, data: I): Promise<T>;
  delete<T>(resource: LegacyResource): Promise<T[]>;
};

/**
 * The SDK 2 CRUD API uses builders and returns a single object for record IDs.
 * Noeko's existing model layer uses the SDK 1 two-argument API and consistently
 * expects arrays. Keep that contract in one place while the rest of the SDK 2
 * surface (connections, queries, values) is used directly.
 */
export type AppDatabase = Omit<Surreal, keyof LegacyCrud> & LegacyCrud;

const normalizeResource = (resource: LegacyResource) => {
  if (typeof resource !== "string") return resource;
  return resource.includes(":") ? new StringRecordId(resource) : new Table(resource);
};

const asArray = <T>(value: T | T[] | undefined): T[] => {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
};

export const createAppDatabase = (): AppDatabase => {
  const db = new Surreal();

  const sdk = {
    select: db.select.bind(db),
    create: db.create.bind(db),
    insert: db.insert.bind(db),
    update: db.update.bind(db),
    upsert: db.upsert.bind(db),
    delete: db.delete.bind(db),
  };

  Object.assign(db, {
    select: async <T>(resource: LegacyResource) =>
      (await sdk.select<T>(normalizeResource(resource) as never)) as T | T[] | undefined,

    create: async <T, I = T>(resource: LegacyResource, data?: I) => {
      const query = sdk.create<T>(normalizeResource(resource) as never);
      const result = data === undefined ? await query : await query.content(data as never);
      return asArray(result as T | T[] | undefined);
    },

    insert: async <T, I = T>(resource: LegacyResource, data: I | I[]) =>
      asArray(
        (await sdk.insert<T>(normalizeResource(resource) as never, data as never)) as
          | T
          | T[]
          | undefined
      ),

    update: async <T, I = T>(resource: LegacyResource, data: I) =>
      (await sdk.update<T>(normalizeResource(resource) as never).content(data as never)) as T,

    merge: async <T, I = Partial<T>>(resource: LegacyResource, data: I) =>
      (await sdk.update<T>(normalizeResource(resource) as never).merge(data as never)) as T,

    upsert: async <T, I = T>(resource: LegacyResource, data: I) =>
      (await sdk.upsert<T>(normalizeResource(resource) as never).content(data as never)) as T,

    delete: async <T>(resource: LegacyResource) =>
      asArray((await sdk.delete<T>(normalizeResource(resource) as never)) as T | T[] | undefined),
  });

  return db as unknown as AppDatabase;
};
