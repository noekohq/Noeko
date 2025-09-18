import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { BrowserRouter } from "react-router";
import { GraphProvider } from "./contexts/GraphContext.tsx";
import { AuthProvider } from "./contexts/AuthContext.tsx";
import { ModalsProvider } from "@mantine/modals";
import "@mantine/core/styles.css";
import "@mantine/tiptap/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/spotlight/styles.css";
import "@mantine/charts/styles.css";
import "@mantine/dates/styles.css";
import "./Global.css";
import "./Global.scss";
import { LayoutProvider } from "./contexts/LayoutContext.tsx";
import { SearchProvider } from "./contexts/SearchContext.tsx";
import { SettingsProvider } from "./contexts/SettingsContext.tsx";
import { useSettings } from "./contexts/SettingsContext.tsx";
import { InteractionProvider } from "./contexts/InteractionContext.tsx";
import { LandscapeProvider } from "./contexts/LandscapeContext.tsx";
import { ErrorBoundary } from "react-error-boundary";
import Error from "./Error.tsx";

const Client = () => {
  return (
    <ErrorBoundary
      fallbackRender={(fallbackProps) => <Error {...fallbackProps} />}
    >
      <BrowserRouter>
        <AuthProvider>
          <SettingsProvider>
            <SearchProvider>
              <LayoutProvider>
                <LandscapeProvider>
                  <GraphProvider>
                    <WrapTheme>
                      <InteractionProvider>
                        <App />
                      </InteractionProvider>
                    </WrapTheme>
                  </GraphProvider>
                </LandscapeProvider>
              </LayoutProvider>
            </SearchProvider>
          </SettingsProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  // <React.StrictMode>
  <Client />,
  // </React.StrictMode>,
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

  return (
    <MantineProvider theme={theme.override} defaultColorScheme={theme.scheme}>
      <ModalsProvider>
        <Notifications position="bottom-right" />
        {children}
      </ModalsProvider>
    </MantineProvider>
  );
}
