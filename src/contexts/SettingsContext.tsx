import {
  createContext,
  useContext,
  useState,
  useEffect,
  useLayoutEffect,
  useMemo,
  ReactNode,
} from "react";
import { IThemeOption, IThemeResolved, IThemeSpec } from "@/declarations/themes";
import { applyCSS, ResolveTheme } from "@core/design/themes";
import { isDarkScheme } from "@core/utils/dom";
import { IUserSettings } from "../../shared/types/user";
import { useAuth } from "@domains/identity/contexts/AuthContext";
import { api } from "@infrastructure/api/client";
import { dynamicActivate, locales } from "@/i18n";

const LOCAL_STORAGE_KEYS = {
  override: "themeOverride",
  scheme: "themeScheme",
  bodyFont: "themeBodyFont",
  headingFont: "themeHeadingFont",
  language: "language",
  graphicsMode: "noeko:graphics-mode",
};

type IGraphicsMode = "full" | "reduced";

type ISettingsContext = {
  ui: {
    language: {
      get: string;
      set: (l: string) => void;
    };
    graphics: {
      mode: {
        get: IGraphicsMode;
        set: (mode: IGraphicsMode) => void;
      };
    };
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
        actual: Exclude<IThemeSpec["scheme"], "auto">;
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

const THEME_OPTIONS: readonly IThemeSpec["override"][] = [
  "noeko",
  "basalt",
  "nord",
  "pinkLady",
  "vaporwave",
  "river",
  "dracula",
  "paper",
];
const THEME_SCHEMES: readonly IThemeSpec["scheme"][] = ["auto", "light", "dark"];
const THEME_FONTS: readonly IThemeSpec["bodyFont"][] = ["sans-serif", "serif"];
const GRAPHICS_MODES: readonly IGraphicsMode[] = ["full", "reduced"];

function getInitialState<T extends string>(
  key: string,
  defaultValue: T,
  validValues: readonly T[]
): T {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const storedValue = localStorage.getItem(key);
      if (storedValue !== null && validValues.includes(storedValue as T)) return storedValue as T;
      if (storedValue !== null) localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Error reading '${key}' from localStorage:`, error);
    }
  }
  return defaultValue;
}

const SettingsContext = createContext<ISettingsContext>({
  ui: {
    language: {
      get: "en",
      set: () => {},
    },
    graphics: {
      mode: {
        get: "full",
        set: () => {},
      },
    },
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

  const [override, setOverride] = useState<IThemeSpec["override"]>(() => {
    const storedOverride = getInitialState(LOCAL_STORAGE_KEYS.override, "noeko", [
      ...THEME_OPTIONS,
      "silicon",
      "onyx",
    ]);
    return storedOverride === "silicon" || storedOverride === "onyx" ? "basalt" : storedOverride;
  });
  const [scheme, setScheme] = useState<IThemeSpec["scheme"]>(() =>
    getInitialState(LOCAL_STORAGE_KEYS.scheme, "auto", THEME_SCHEMES)
  );
  const [bodyFont, setBodyFont] = useState<IThemeSpec["bodyFont"]>(() =>
    getInitialState(LOCAL_STORAGE_KEYS.bodyFont, "sans-serif", THEME_FONTS)
  );
  const [headingFont, setHeadingFont] = useState<IThemeSpec["headingFont"]>(() =>
    getInitialState(LOCAL_STORAGE_KEYS.headingFont, "sans-serif", THEME_FONTS)
  );
  const [language, setLanguage] = useState<string>(() =>
    getInitialState(LOCAL_STORAGE_KEYS.language, "en", Object.keys(locales))
  );
  const [graphicsMode, setGraphicsMode] = useState<IGraphicsMode>(() =>
    getInitialState(LOCAL_STORAGE_KEYS.graphicsMode, "full", GRAPHICS_MODES)
  );

  useEffect(() => {
    console.log("Language changed: ", language);
  }, [language]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.graphicsMode, graphicsMode);
    } catch (error) {
      console.warn(`Error saving '${LOCAL_STORAGE_KEYS.graphicsMode}' to localStorage:`, error);
    }
  }, [graphicsMode]);

  useLayoutEffect(() => {
    document.documentElement.dataset.graphicsMode = graphicsMode;
  }, [graphicsMode]);

  useEffect(() => {
    const handleGraphicsModeStorage = (event: StorageEvent) => {
      if (event.key !== LOCAL_STORAGE_KEYS.graphicsMode) return;
      const nextMode = GRAPHICS_MODES.includes(event.newValue as IGraphicsMode)
        ? (event.newValue as IGraphicsMode)
        : "full";
      setGraphicsMode(nextMode);
    };

    window.addEventListener("storage", handleGraphicsModeStorage);
    return () => window.removeEventListener("storage", handleGraphicsModeStorage);
  }, []);

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

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem(LOCAL_STORAGE_KEYS.language, language);
      }
    } catch (error) {
      console.warn(`Error saving '${LOCAL_STORAGE_KEYS.language}' to localStorage:`, error);
    }
  }, [language]);

  useEffect(() => {
    dynamicActivate(language);
  }, [language]);

  const resolvedTheme = useMemo(
    () =>
      ResolveTheme({
        override,
        scheme,
        bodyFont,
        headingFont,
      }),
    [override, scheme, bodyFont, headingFont]
  );

  useLayoutEffect(() => {
    applyCSS(resolvedTheme.applicator);
  }, [resolvedTheme]);

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
          language: {
            get: language,
            set: (l: string) => {
              setLanguage(l);
            },
          },
          graphics: {
            mode: {
              get: graphicsMode,
              set: setGraphicsMode,
            },
          },
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
              get: resolvedTheme,
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
