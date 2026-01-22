export type IRole = {
  id: string;
  name: string;
  description: string;
};

export type IRoleForm = Omit<IRole, "id">;

export type IUserSettings = {
  isNew: boolean;
};

export type IUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  scratchpadContent: string;
  roles: RecordId[];
  disabled: boolean;
  referralCode?: string;
  acceptedTermsOfServiceAt: Date | null;
  acceptedPrivacyPolicyAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  settings: IUserSettings;
};

export type IUserForm = Omit<
  IUser,
  "id" | "createdAt" | "updatedAt" | "roles" | "disabled" | "referralCode"
>;

export type ISafeUser = Omit<IUser, "password">;
export type IPublicUser = Omit<
  IUser,
  | "password"
  | "email"
  | "roles"
  | "disabled"
  | "referralCode"
  | "scratchpadContent"
  | "acceptedTermsOfServiceAt"
  | "acceptedPrivacyPolicyAt"
  | "settings"
  | "updatedAt"
>;

export type IFriendUser = Omit<
  IUser,
  | "password"
  | "roles"
  | "disabled"
  | "referralCode"
  | "scratchpadContent"
  | "acceptedTermsOfServiceAt"
  | "acceptedPrivacyPolicyAt"
  | "settings"
  | "updatedAt"
>;

export type IToken = {
  id: string;
  value: string;
  user: IUser;
  type: string;
  createdAt: Date;
  expiresAt: Date;
};

export type ITokenForm = Omit<IToken, "id" | "user"> & {
  user: StringRecordId;
};

export type IDailyActivity = {
  day: string;
  dailyCount: number;
};

export type IComputedProperties = {
  numIdeas: number;
  ideaActivity: IDailyActivity[];
  ideaViewActivity: IDailyActivity[];
  taskActivity: IDailyActivity[];
  spyglassActivity: IDailyActivity[];
};

export type IComputedUser = IUser & IComputedProperties;
export type ISafeComputedUser = ISafeUser & IComputedProperties;

export type IUserActivity = {
  numIdeas: number;
  ideaActivity: IDailyActivity[];
  ideaViewActivity: IDailyActivity[];
  taskActivity: IDailyActivity[];
};
