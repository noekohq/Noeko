import { RecordId } from "surrealdb";
import { markdownToHtml } from "../utils/formatting";
import { Idea, IIdeaForm } from "../database/models/ideas";
import { IImport, Import } from "../database/models/import";
import { IUser, User } from "../database/models/user";
import { randomUUIDv7 } from "bun";

export type IChunk = {
  id: string;
  items: IIdeaForm[];
  totalSize: number;
};

const maxAge = 30; // Seconds

export class ImporterManager {
  private importers: Record<
    string,
    {
      inactivity: number;
      importer: Importer;
    }
  >;
  private watchInterval?: Timer;

  constructor() {
    this.importers = {};
    this.watch();
  }

  public dispose() {
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
    }
  }

  private watch() {
    this.watchInterval = setInterval(() => {
      Object.values(this.importers).forEach((i) => {
        if (i.inactivity > maxAge) {
          this.remove(i.importer);
          return;
        }
        i.inactivity += 1;
      });
    }, 1000);
  }

  public async create(userId: string | RecordId) {
    const importer = new Importer(userId);
    await importer.initialize();
    this.add(importer);
    return importer;
  }

  public async finalize(importer: string | Importer) {
    try {
      if (typeof importer === "string") {
        const i = this.importers[importer];
        if (i) {
          await i.importer.complete();
        } else {
          throw new Error(
            "Tried to complete an importer in manager that isn't registered.",
          );
        }
        this.remove(importer);
        return true;
      }
      if (!importer.instanceId) {
        throw new Error(
          "Attempted to complete an importer in manager that has not been initialized.",
        );
      }
      await importer.complete();
      this.remove(importer);
      return true;
    } catch (error) {
      console.error("Error finalizing importer", error);
      return false;
    }
  }

  public add(importer: Importer) {
    if (!importer.instanceId) {
      throw new Error(
        "Attempted to register an importer that has not been initialized.",
      );
    }
    this.importers[importer.instanceId] = {
      inactivity: 0,
      importer,
    };
  }

  public remove(importer: string | Importer) {
    if (typeof importer === "string") {
      delete this.importers[importer];
      return;
    }
    if (!importer.instanceId) {
      throw new Error(
        "Attempted to unregister an importer that has not been initialized.",
      );
    }
    delete this.importers[importer.instanceId];
  }

  public async pipeChunk(id: string, chunk: IChunk) {
    try {
      const i = this.importers[id];
      i.inactivity = 0;
      const piped = await i.importer.processChunk(chunk);
      return piped;
      // console.log("Simulating piping of chunk: ", chunk);
      // return true;
    } catch (error) {
      return false;
    }
  }
}

export class Importer {
  private _importId: string | RecordId | undefined;
  private importInstance: IImport | undefined;
  private _userId: string | RecordId;
  private user: IUser | undefined;
  private ideaIds: Set<string> = new Set();
  private adjacencyList: Record<string, string[]>;

  constructor(userId: string | RecordId, importId?: string | RecordId) {
    this._userId = userId;
    this._importId = importId;
    this.adjacencyList = {};
  }

  get importId() {
    return this._importId;
  }

  get instanceId() {
    return this._importId?.toString();
  }

  get userId() {
    return this._userId;
  }

  public async initialize(): Promise<string | undefined> {
    try {
      const foundUser = await User.get(this.userId);
      if (!foundUser) {
        throw new Error("Error getting user in import");
      }
      this.user = foundUser;
      if (this.importId) {
        const foundImport = await Import.get(this.importId);
        if (!foundImport) {
          throw new Error("Error finding import record");
        }
        this.importInstance = foundImport;
        return foundImport.id.toString();
      } else {
        const newImport = await Import.create(this.userId);
        if (!newImport) {
          throw new Error("New import not created on importer instance");
        }
        this._importId = newImport.id.toString();
        this.importInstance = newImport;
        return newImport.id.toString();
      }
    } catch (error) {
      console.error("Error initializing importer: ", error);
      return undefined;
    }
  }

  public async processChunk(chunk: IChunk) {
    try {
      if (!this.importId) {
        throw new Error(
          "Tried to process a chunk on an importer that does not have an importId",
        );
      }
      const { id, items } = chunk;
      console.info(`Processing ${id} with ${items.length} items...`);
      const created = await Idea.createMany(items, this.userId, {
        wereImported: true,
        omitEmbeddings: true,
        omitDerivations: true,
      });
      if (!created) {
        throw new Error("Error creating ideas while processing chunk...");
      }
      const idsCreated = created.map((i) => i.id.toString());
      idsCreated.forEach((i) => {
        this.ideaIds.add(i);
      });
      await Import.connectToIdeas(idsCreated, this.importId);
      return true;
    } catch (error) {
      console.error(`Error processing chunk ${chunk.id}`, error);
      return undefined;
    }
  }

  public async loadEmbeddingsForIdeas() {
    try {
      const ideaIds = Array.from(this.ideaIds.values());
      const loadedEmbeddings = await Idea.loadManyEmbeddings(ideaIds);
      if (!loadedEmbeddings) {
        throw new Error("Error loading embeddings");
      }
      return true;
    } catch (error) {
      console.error(
        `Error loading embeddings for import ${this.importId}: `,
        error,
      );
      return false;
    }
  }

  public async complete() {
    try {
      await this.loadEmbeddingsForIdeas();
      return true;
    } catch (error) {
      console.error("Error completing importer instance: ", error);
      return undefined;
    }
  }
}
