import React, { useContext, useEffect, useState } from "react";
import { ISafeUser, IUser } from "../../app/database/models/user";
import useFetch from "../hooks/useFetch";
import { showNotification } from "@mantine/notifications";

type IAuthContext = {
  user: ISafeUser | undefined;
  loggedIn: boolean;
  setTokens: (accessToken: string, refreshToken?: string) => void;
  clearTokens: () => void;
  loadUser: () => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
};

const initialAuthContext: IAuthContext = {
  user: undefined,
  loggedIn: false,
  setTokens: (accessToken: string, refreshToken?: string) => {},
  clearTokens: () => {},
  loadUser: async () => {},
  logout: async () => {},
  loading: false,
};

const AuthContext = React.createContext<IAuthContext>(initialAuthContext);

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const setTokens = (accessToken: string, refreshToken?: string) => {
    localStorage.setItem("accessToken", accessToken);
    if (refreshToken) {
      localStorage.setItem("refreshToken", refreshToken);
    }
  };

  const clearTokens = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  };

  const {
    data: user,
    load: loadUser,
    loading,
  } = useFetch<undefined, ISafeUser>({
    url: "/users/me",
    onError: (error) => {
      showNotification({
        title: "Not authenticated",
        message: "Please log in to continue",
        color: "red",
      });
      clearTokens();
      console.error(error);
    },
    runOnMount: localStorage.getItem("accessToken") ? true : false,
  });

  const loggedIn = !!user?.id;

  const value: IAuthContext = {
    user,
    loading,
    loggedIn,
    setTokens,
    clearTokens,
    loadUser: async () => {
      await loadUser();
    },
    logout: async () => {
      clearTokens();
      await loadUser();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export { AuthContext, AuthProvider };

export const useAuth = () => useContext(AuthContext);
