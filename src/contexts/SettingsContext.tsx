import { createContext, useContext, useState } from "react";

type ITheme = "light" | "dark";

type ISettingsContext = {
  ui: {
    theme: {
      get: () => ITheme;
      set: (theme: ITheme) => void;
      resolved: ITheme;
    };
  };
};

const SettingsContext = createContext<ISettingsContext>({
  ui: {
    theme: {
      get: () => "light",
      set: (theme: ITheme) => {},
      resolved: "light",
    },
  },
});

export const SettingsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [theme, setTheme] = useState<ITheme>("light");

  return (
    <SettingsContext.Provider
      value={{
        ui: { theme: { get: () => theme, set: setTheme, resolved: theme } },
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
