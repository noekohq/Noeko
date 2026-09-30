import { Database } from "@hocuspocus/extension-database";
import { Throttle } from "@hocuspocus/extension-throttle";
import { Server } from "@hocuspocus/server";
import { TiptapTransformer } from "@hocuspocus/transformer";
import { generateHTML, generateJSON } from "@tiptap/html";
import { parse } from "cookie";
import { applyUpdate, Doc, encodeStateAsUpdate } from "yjs";

import { Idea } from "../database/models/ideas";
import { ISafeIdea } from "../../shared/types/idea";
import Task, { ITask } from "../database/models/task";
import { ISafeUser } from "../../shared/types/user";
import { extensions } from "../lib/editing/tiptap/extensions";
import { getDatabase } from "../database/db";
import Authorization from "../services/Authorization";
import { Connectable } from "../services/Graph";
import { verifyToken } from "../utils/crypto";
import { toBase64, toUint8Array } from "../utils/data";

const getOrCreateInitialState = async (recordId: string, html: string) => {
  const json = generateJSON(html, extensions);
  const document = TiptapTransformer.toYdoc(json, "default", extensions);
  const initialState = toBase64(encodeStateAsUpdate(document));
  const db = await getDatabase();

  if (!db) {
    throw new Error(`Could not persist the initial collaboration state for ${recordId}.`);
  }

  // Converting the same HTML twice creates Yjs structures with different client
  // IDs. If those structures later meet during a reconnect, Yjs correctly keeps
  // both and the document appears duplicated. Persist the first conversion
  // atomically and always return the winning state so every room load starts
  // from the same Yjs history.
  const [record] = await db.query<[{ yState?: string }]>(
    `
      UPDATE ONLY <record>$recordId
      SET yState = IF yState = NONE OR yState = NULL THEN $initialState ELSE yState END
      RETURN AFTER;
    `,
    { recordId, initialState }
  );

  if (!record?.yState) {
    throw new Error(`Could not load the initial collaboration state for ${recordId}.`);
  }

  return toUint8Array(record.yState);
};

const database = new Database({
  fetch: async ({ documentName }) => {
    const recordId = documentName;

    const connectable = new Connectable(recordId);
    const type = connectable.type;
    const thing = await connectable.get();

    if (!thing) {
      throw new Error("Document not found");
    }

    switch (type) {
      case "idea": {
        const idea = thing as ISafeIdea;
        if (idea.yState) {
          return toUint8Array(idea.yState);
        }
        if (idea.content) {
          return getOrCreateInitialState(recordId, idea.content);
        }
        return null;
      }
      case "task": {
        const task = thing as ITask;
        if (task.yState) {
          return toUint8Array(task.yState);
        }
        if (task.scratchpad) {
          return getOrCreateInitialState(recordId, task.scratchpad);
        }
        return null;
      }
      default:
        return null;
    }
  },
  store: async ({ documentName, state }) => {
    const connectable = new Connectable(documentName);
    const tempDoc = new Doc();
    applyUpdate(tempDoc, state);
    const json = TiptapTransformer.fromYdoc(tempDoc, "default");
    const html = generateHTML(json, extensions);

    const type = connectable.type;
    switch (type) {
      case "idea":
        await Idea.update(documentName, {
          yState: toBase64(state),
          content: html,
        });
        break;
      case "task":
        await Task.update(documentName, {
          yState: toBase64(state),
          scratchpad: html,
        });
        break;
      default:
        break;
    }
  },
});

const throttle = new Throttle({
  throttle: 15,
  banTime: 5,
});

const collabServer = new Server({
  extensions: [database, throttle],
  onAuthenticate: async (data) => {
    const { request, documentName } = data;

    const rawCookies = request.headers.cookie || "";
    const cookies = parse(rawCookies);
    const token = cookies.accessToken;

    if (!token) {
      throw new Error("Unauthorized.");
    }

    const user = await verifyToken<ISafeUser>(token);
    if (!user) {
      throw new Error("Unauthorized.");
    }

    const auth = new Authorization(user.id.toString());
    const hasAccess = await auth.hasAccess(documentName, "editor");

    if (!hasAccess) {
      throw new Error("Unauthorized.");
    }

    return {
      user: {
        id: user.id,
        name: user || "Mysterious Collaborator",
      },
    };
  },
  debounce: 500,
});

export default collabServer;
