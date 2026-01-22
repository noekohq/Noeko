import { IConnectable } from "./constellation";
import { IFriendUser, IPublicUser } from "./user";

export type IIdeaShareAccess = "editor" | "viewonly";

export type IIdeaShare = {
  id: string;
  in: string;
  out: string;
  accessLevel: IIdeaShareAccess;
};

export type IIdeaShareDetails = {
  user: IPublicUser;
  accessLevel: IIdeaShareAccess;
};

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
