import { createContext, useCallback, useContext, useState, useEffect, ReactNode } from "react";
import { IThemeOption, IThemeResolved, IThemeSpec } from '@/declarations/themes';
import { ResolveTheme } from '@core/design/themes';
import { isDarkScheme } from '@core/utils/dom';
import { IUserSettings } from "../../shared/types/user";
import { useAuth } from "./AuthContext";
import { api } from '@/server/api';

const LOCAL_STORAGE_KEYS = {
  override: "themeOverride",
  scheme: "themeScheme",
  bodyFont: "themeBodyFont",
  headingFont: "themeHeadingFont",
};

type ISettingsContext = {
  ui: {
    theme: {
      override: {
        get: IThemeSpec["override"];
        set: (o: IThemeSpec["override"]) => void;
      };
      bodyFont: {
        get: IThemeSpec["bodyFont"];
        set: (f: IThemeSpec["bodyFont"]) => void;
      };
      headingFont: {
        // Added headingFont
        get: IThemeSpec["headingFont"];
        set: (f: IThemeSpec["headingFont"]) => void;
      };
      scheme: {
        get: IThemeSpec["scheme"];
        set: (s: IThemeSpec["scheme"]) => void;
        actual: IThemeSpec["scheme"];
      };
      resolved: {
        get: IThemeResolved;
      };
    };
  };
  user: {
    setSetting: (setting: keyof IUserSettings, value: any) => Promise<boolean | undefined>;
  };
};

function getInitialState<T>(key: string, defaultValue: T): T {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const storedValue = localStorage.getItem(key);
      if (storedValue !== null) {
        return storedValue as unknown as T;
      }
    } catch (error) {
      console.warn(`Error reading '${key}' from localStorage:`, error);
    }
  }
  return defaultValue;
}

const SettingsContext = createContext<ISettingsContext>({
  ui: {
    theme: {
      override: {
        get: "noeko",
        set: () => {},
      },
      bodyFont: {
        get: "sans-serif",
        set: () => {},
      },
      headingFont: {
        get: "sans-serif",
        set: () => {},
      },
      scheme: {
        get: "auto",
        set: () => {},
        actual: "light",
      },
      resolved: {
        get: {
          scheme: "light",
          override: {},
        } as IThemeResolved,
      },
    },
  },
  user: {
    setSetting: async () => undefined,
  },
});

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const { user, reload } = useAuth();

  const [override, setOverride] = useState<IThemeSpec["override"]>(() =>
    getInitialState(LOCAL_STORAGE_KEYS.override, "noeko")
  );
  const [scheme, setScheme] = useState<IThemeSpec["scheme"]>(() =>
    getInitialState(LOCAL_STORAGE_KEYS.scheme, "auto")
  );
  const [bodyFont, setBodyFont] = useState<IThemeSpec["bodyFont"]>(() =>
    getInitialState(LOCAL_STORAGE_KEYS.bodyFont, "sans-serif")
  );
  const [headingFont, setHeadingFont] = useState<IThemeSpec["headingFont"]>(() =>
    getInitialState(LOCAL_STORAGE_KEYS.headingFont, "sans-serif")
  );

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem(LOCAL_STORAGE_KEYS.override, override);
      }
    } catch (error) {
      console.warn(`Error saving '${LOCAL_STORAGE_KEYS.override}' to localStorage:`, error);
    }
  }, [override]);

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem(LOCAL_STORAGE_KEYS.scheme, scheme);
      }
    } catch (error) {
      console.warn(`Error saving '${LOCAL_STORAGE_KEYS.scheme}' to localStorage:`, error);
    }
  }, [scheme]);

  // Effect for persisting 'bodyFont'
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem(LOCAL_STORAGE_KEYS.bodyFont, bodyFont);
      }
    } catch (error) {
      console.warn(`Error saving '${LOCAL_STORAGE_KEYS.bodyFont}' to localStorage:`, error);
    }
  }, [bodyFont]);

  // Effect for persisting 'headingFont'
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem(LOCAL_STORAGE_KEYS.headingFont, headingFont);
      }
    } catch (error) {
      console.warn(`Error saving '${LOCAL_STORAGE_KEYS.headingFont}' to localStorage:`, error);
    }
  }, [headingFont]);

  const resolvedTheme = useCallback(
    (): IThemeResolved =>
      // Explicit return type
      ResolveTheme({
        override,
        scheme,
        bodyFont,
        headingFont,
      }),
    [override, scheme, bodyFont, headingFont]
  );

  const setUserSetting: ISettingsContext["user"]["setSetting"] = async (setting, value) => {
    try {
      const result = await api.put("/users/me", {
        settings: {
          ...user?.settings,
          [setting]: value,
        },
      });
      return !!result.data.data;
    } catch (error) {
      console.error("Couldn't set user setting");
      return undefined;
    }
  };

  return (
    <SettingsContext.Provider
      value={{
        ui: {
          theme: {
            override: {
              get: override,
              set: setOverride,
            },
            scheme: {
              get: scheme,
              set: setScheme,
              actual: scheme === "auto" ? (isDarkScheme() ? "dark" : "light") : scheme,
            },
            bodyFont: {
              get: bodyFont,
              set: setBodyFont,
            },
            headingFont: {
              get: headingFont,
              set: setHeadingFont,
            },
            resolved: {
              get: resolvedTheme(),
            },
          },
        },
        user: {
          setSetting: setUserSetting,
        },
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};
