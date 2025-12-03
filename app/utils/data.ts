export const toBase64 = (uint8Array: Uint8Array) =>
  Buffer.from(uint8Array).toString("base64");
export const toUint8Array = (base64String: string) =>
  new Uint8Array(Buffer.from(base64String, "base64"));
