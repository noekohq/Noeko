import { Readable } from "node:stream";

export const nodeToWeb = (nodeStream: Readable): ReadableStream => {
  return Readable.toWeb(nodeStream) as unknown as ReadableStream;
};
