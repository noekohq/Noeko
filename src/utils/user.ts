import { ISafeUser, IUser } from "../../app/database/models/user";

export const userInitials = (user: ISafeUser | undefined) => {
  if (!user) return "";
  const initials = user.firstName.charAt(0) + user.lastName.charAt(0);
  return initials.toUpperCase();
};
