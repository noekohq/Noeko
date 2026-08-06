import type { IShare, IShareAccess } from "./share";
import type { IGraphSnapshotEdge } from "./graph-snapshot";
import type { IPublicUser } from "./user";

/**
 * A share relationship projected for graph display.
 *
 * The database always stores item -> recipient. The graph always displays
 * item -> the other person: recipient for outgoing shares, owner for incoming
 * shares. Keeping both representations prevents graph concerns from changing
 * the persistence model's meaning.
 */
export type IGraphShare = IShare & {
  in: string;
  out: string;
  accessLevel: IShareAccess;
  direction: "incoming" | "outgoing";
  counterpart: IPublicUser;
  database: {
    in: string;
    out: string;
  };
};

export type IGraphSnapshotShareEdge = IGraphSnapshotEdge & {
  type: "share";
  accessLevel: IShareAccess;
  direction: IGraphShare["direction"];
};
