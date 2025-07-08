import { IPublicUser, ISafeUser, IUser } from "../../app/database/models/user";

export const userInitials = (user: ISafeUser | undefined) => {
  if (!user) return "";
  const initials = user.firstName.charAt(0) + user.lastName.charAt(0);
  return initials.toUpperCase();
};

export const userIsSuperuser = (user: ISafeUser | undefined) => {
  if (!user) return false;
  return !!user.roles.find((role) => role.toString() === "role:superuser");
};

export const userFormattedName = (
  user: ISafeUser | IPublicUser | undefined,
) => {
  if (!user) return "";
  return `${user.firstName} ${user.lastName}`;
};
