import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { BrowserRouter } from "react-router";
import { GraphProvider } from "./contexts/GraphContext.tsx";
import { AuthProvider } from "./contexts/AuthContext.tsx";
import { ModalsProvider } from "@mantine/modals";
import "@mantine/tiptap/styles.css";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/spotlight/styles.css";
import "./Global.css";
import "./Global.scss";
import { LayoutProvider } from "./contexts/LayoutContext.tsx";
import { SearchProvider } from "./contexts/SearchContext.tsx";
import { SettingsProvider } from "./contexts/SettingsContext.tsx";
import { useSettings } from "./contexts/SettingsContext.tsx";

const Client = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <SearchProvider>
            <LayoutProvider>
              <GraphProvider>
                <WrapTheme>
                  <App />
                </WrapTheme>
              </GraphProvider>
            </LayoutProvider>
          </SearchProvider>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Client />
  </React.StrictMode>,
);

type IWrapThemeProps = {
  children: React.ReactNode | React.ReactNode[];
};

function WrapTheme({ children }: IWrapThemeProps) {
  const {
    ui: {
      theme: {
        resolved: { get: theme },
      },
    },
  } = useSettings();

  console.log("Resolved theme: ", theme);

  return (
    <MantineProvider theme={theme.override} defaultColorScheme={theme.scheme}>
      <ModalsProvider>
        <Notifications position="bottom-right" />
        {children}
      </ModalsProvider>
    </MantineProvider>
  );
}
