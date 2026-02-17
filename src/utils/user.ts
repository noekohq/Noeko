import { IPublicUser, ISafeUser, IUser, IUserForm } from "../../app/database/models/user";
import { api } from "../server/api";

export const userInitials = (user: ISafeUser | IPublicUser | undefined) => {
  if (!user) return "";
  const initials = user.firstName.charAt(0) + user.lastName.charAt(0);
  return initials.toUpperCase();
};

export const userIsSuperuser = (user: ISafeUser | undefined) => {
  if (!user) return false;
  return !!user.roles.find((role) => role.toString() === "role:superuser");
};

export const userFormattedName = (user: ISafeUser | IPublicUser | undefined) => {
  if (!user) return "";
  return `${user.firstName} ${user.lastName}`;
};

export const updateUser = async (form: Partial<IUserForm>) => {
  return api.put("/users/me", {
    ...form,
  });
};
