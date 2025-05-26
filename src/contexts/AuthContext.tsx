import React, {
  useContext,
  useEffect,
  useState,
  createContext,
  useCallback,
} from "react";
import { ISafeUser } from "../../app/database/models/user";
import useFetch from "../hooks/useFetch";
import { showNotification } from "@mantine/notifications";

type AuthState = {
  user: (ISafeUser & { totalIdeas: number }) | undefined;
  loading: boolean;
};

type AuthActions = {
  setTokens: (accessToken: string, refreshToken?: string) => void;
  clearTokens: () => void;
  login: (accessToken: string, refreshToken?: string) => Promise<void>;
  logout: () => void;
  reload: () => Promise<void>;
  loggedIn: boolean;
};

type IAuthContext = AuthState & AuthActions;

const initialAuthState: AuthState = {
  user: undefined,
  loading: true,
};

const initialAuthActions: AuthActions = {
  setTokens: () => {},
  clearTokens: () => {},
  login: async () => {},
  logout: () => {},
  reload: async () => {},
  loggedIn: false,
};

const AuthContext = createContext<IAuthContext>({
  ...initialAuthState,
  ...initialAuthActions,
});

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<
    (ISafeUser & { totalIdeas: number }) | undefined
  >(initialAuthState.user);
  const [loading, setLoading] = useState<boolean>(initialAuthState.loading);

  const setTokens = useCallback((accessToken: string) => {
    localStorage.setItem("accessToken", accessToken);
  }, []);

  const clearTokens = useCallback(() => {
    localStorage.removeItem("accessToken");
  }, []);

  const { load: performUserFetch } = useFetch<
    undefined,
    ISafeUser & {
      totalIdeas: number;
    }
  >({
    url: "/users/me",
    onSuccess: (data) => {
      setUser(data ?? undefined);
      setLoading(false);
    },
    onError: (error) => {
      console.error("AuthProvider: User fetch error", error);
      clearTokens();
      setUser(undefined);
      setLoading(false);
    },
  });

  useEffect(() => {
    const accessToken = localStorage.getItem("accessToken");
    if (accessToken) {
      setLoading(true);
      performUserFetch();
    } else {
      setUser(undefined);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [performUserFetch]);

  const login = useCallback(
    async (accessToken: string) => {
      setTokens(accessToken);
      setLoading(true);
      try {
        await performUserFetch();
      } catch (error) {
        showNotification({
          title: "Login Failed",
          message: "Could not verify your credentials. Please try again.",
          color: "red",
        });
      }
    },
    [setTokens, performUserFetch],
  );

  const logout = useCallback(() => {
    clearTokens();
    setUser(undefined);
    setLoading(false);
    window.location.reload();
  }, [clearTokens]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      await performUserFetch();
    } catch (error) {
      showNotification({
        title: "Reload Failed",
        message: "Could not reload your credentials. Please try again.",
        color: "red",
      });
    }
  }, [performUserFetch]);

  const value = React.useMemo(
    () =>
      ({
        user,
        loading,
        setTokens,
        clearTokens,
        login,
        logout,
        reload,
        loggedIn: !!user?.id,
      }) satisfies IAuthContext,
    [user, loading, setTokens, clearTokens, login, logout, reload],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return {
    ...context,
  };
};

export { AuthContext, AuthProvider };
