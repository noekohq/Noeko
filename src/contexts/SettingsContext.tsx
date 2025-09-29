import {
  createContext,
  useCallback,
  useContext,
  useState,
  useEffect, // Added useEffect
  ReactNode, // Added ReactNode for clarity
} from "react";
import {
  IThemeOption,
  IThemeResolved,
  IThemeSpec,
} from "../declarations/themes"; // Assuming these paths are correct
import { ResolveTheme } from "../themes"; // Assuming this path is correct
import { isDarkScheme } from "../utils/dom";

// Define keys for localStorage
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
};

// Helper to get initial value from localStorage or return default
function getInitialState<T>(key: string, defaultValue: T): T {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const storedValue = localStorage.getItem(key);
      if (storedValue !== null) {
        // Assuming theme spec values are strings or string literals.
        // If they were complex objects, JSON.parse(storedValue) would be needed.
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
        get: "noeko", // Default value
        set: () => {},
      },
      bodyFont: {
        get: "sans-serif", // Default value
        set: () => {},
      },
      headingFont: {
        // Added default for headingFont
        get: "sans-serif", // Default value
        set: () => {},
      },
      scheme: {
        get: "auto", // Default value
        set: () => {},
        actual: "light",
      },
      resolved: {
        // This default should ideally be a fully formed IThemeResolved
        // or a minimal valid one if ResolveTheme is not available here.
        get: {
          scheme: "light", // Example: Assuming IThemeResolved has a concrete scheme
          override: {}, // Example: Assuming MantineThemeOverride
          // Potentially add other default resolved properties if needed
        } as IThemeResolved, // Cast to ensure it matches the type
      },
    },
  },
});

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [override, setOverride] = useState<IThemeSpec["override"]>(() =>
    getInitialState(LOCAL_STORAGE_KEYS.override, "noeko"),
  );
  const [scheme, setScheme] = useState<IThemeSpec["scheme"]>(() =>
    getInitialState(LOCAL_STORAGE_KEYS.scheme, "auto"),
  );
  const [bodyFont, setBodyFont] = useState<IThemeSpec["bodyFont"]>(() =>
    getInitialState(LOCAL_STORAGE_KEYS.bodyFont, "sans-serif"),
  );
  const [headingFont, setHeadingFont] = useState<IThemeSpec["headingFont"]>(
    () => getInitialState(LOCAL_STORAGE_KEYS.headingFont, "sans-serif"),
  );

  // Effect for persisting 'override'
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem(LOCAL_STORAGE_KEYS.override, override);
      }
    } catch (error) {
      console.warn(
        `Error saving '${LOCAL_STORAGE_KEYS.override}' to localStorage:`,
        error,
      );
    }
  }, [override]);

  // Effect for persisting 'scheme'
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem(LOCAL_STORAGE_KEYS.scheme, scheme);
      }
    } catch (error) {
      console.warn(
        `Error saving '${LOCAL_STORAGE_KEYS.scheme}' to localStorage:`,
        error,
      );
    }
  }, [scheme]);

  // Effect for persisting 'bodyFont'
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem(LOCAL_STORAGE_KEYS.bodyFont, bodyFont);
      }
    } catch (error) {
      console.warn(
        `Error saving '${LOCAL_STORAGE_KEYS.bodyFont}' to localStorage:`,
        error,
      );
    }
  }, [bodyFont]);

  // Effect for persisting 'headingFont'
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem(LOCAL_STORAGE_KEYS.headingFont, headingFont);
      }
    } catch (error) {
      console.warn(
        `Error saving '${LOCAL_STORAGE_KEYS.headingFont}' to localStorage:`,
        error,
      );
    }
  }, [headingFont]);

  const resolvedTheme = useCallback(
    // Renamed to avoid conflict, and ensure it returns IThemeResolved
    (): IThemeResolved => // Explicit return type
      ResolveTheme({
        override,
        scheme,
        bodyFont,
        headingFont,
      }),
    [override, scheme, bodyFont, headingFont],
  );

  return (
    <SettingsContext.Provider
      value={{
        ui: {
          theme: {
            override: {
              get: override,
              set: setOverride, // Simplified setter
            },
            scheme: {
              get: scheme,
              set: setScheme, // Simplified setter
              actual:
                scheme === "auto"
                  ? isDarkScheme()
                    ? "dark"
                    : "light"
                  : scheme,
            },
            bodyFont: {
              get: bodyFont,
              set: setBodyFont, // Simplified setter
            },
            headingFont: {
              // Added headingFont to context value
              get: headingFont,
              set: setHeadingFont, // Simplified setter
            },
            resolved: {
              get: resolvedTheme(), // Use the memoized function call
            },
          },
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
