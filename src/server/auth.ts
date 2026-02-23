import { api } from '@infrastructure/api/client';

export const handleLogout = () => {
  api.post("/users/logout");
};
