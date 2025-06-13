import { api } from "./api";

export const handleLogout = () => {
  api.post("/users/logout");
};
