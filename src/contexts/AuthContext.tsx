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
import { getReferralLinkFromCode } from "../vars/users";
import { handleLogout } from "../server/auth";
import { userIsSuperuser } from "../utils/user";
import { Modal, Text } from "@mantine/core";

type AuthState = {
  user: (ISafeUser & { totalIdeas: number }) | undefined;
  loading: boolean;
  referralLink: string | undefined;
};

type AuthActions = {
  setTokens: (accessToken: string, refreshToken?: string) => void;
  clearTokens: () => void;
  login: (accessToken: string, refreshToken?: string) => Promise<void>;
  logout: () => void;
  reload: () => Promise<void>;
  acceptToS: () => Promise<void>;
  acceptPrivacyPolicy: () => Promise<void>;
  acceptBoth: () => Promise<void>;
  loggedIn: boolean;
  isSuperuser: boolean;
};

type IAuthContext = AuthState & AuthActions;

const initialAuthState: AuthState = {
  user: undefined,
  loading: true,
  referralLink: "",
};

const initialAuthActions: AuthActions = {
  setTokens: () => {},
  clearTokens: () => {},
  login: async () => {},
  logout: () => {},
  reload: async () => {},
  acceptToS: async () => {},
  acceptPrivacyPolicy: async () => {},
  acceptBoth: async () => {},
  loggedIn: false,
  isSuperuser: false,
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

  const { load: acceptTermsOfService } = useFetch<undefined, undefined>({
    url: "/users/accept/terms-of-service",
    method: "POST",
    onSuccess: () => {
      showNotification({
        title: "Terms Accepted",
        message: "You have successfully accepted the terms of service.",
        color: "green",
      });
    },
    onError: (error) => {
      console.error("Error accepting terms of service:", error);
      showNotification({
        title: "Terms Acceptance Failed",
        message: "Could not accept the terms of service. Please try again.",
        color: "red",
      });
    },
    onFinally: () => {
      reload();
    },
  });

  const { load: acceptPrivacyPolicy } = useFetch<undefined, undefined>({
    url: "/users/accept/privacy-policy",
    method: "POST",
    onSuccess: () => {
      showNotification({
        title: "Policy Accepted",
        message: "You have successfully accepted the privacy policy.",
        color: "green",
      });
    },
    onError: (error) => {
      console.error("Error accepting privacy policy:", error);
      showNotification({
        title: "Policy Acceptance Failed",
        message: "Could not accept the privacy policy. Please try again.",
        color: "red",
      });
    },
    onFinally: () => {
      reload();
    },
  });

  const { load: acceptBoth } = useFetch<undefined, undefined>({
    url: "/users/accept/both",
    method: "POST",
    onSuccess: () => {
      console.info("Successfully accepted both policies");
      showNotification({
        title: "Policies Accepted",
        message: "You have successfully accepted both policies.",
        color: "green",
      });
    },
    onError: (error) => {
      console.error("Error accepting both policies:", error);
      showNotification({
        title: "Policy Acceptance Failed",
        message: "Could not accept the privacy policy. Please try again.",
        color: "red",
      });
    },
    onFinally: () => {
      reload();
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
    handleLogout();
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
        acceptToS: async () => {
          await acceptTermsOfService();
        },
        acceptPrivacyPolicy: async () => {
          await acceptPrivacyPolicy();
        },
        acceptBoth: async () => {
          await acceptBoth();
        },
        loggedIn: !!user?.id,
        referralLink: user?.referralCode
          ? getReferralLinkFromCode(user.referralCode)
          : undefined,
        isSuperuser: userIsSuperuser(user),
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
