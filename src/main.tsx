import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { BrowserRouter } from "react-router";
import { GraphProvider } from "@domains/constellation/contexts/GraphContext";
import { AuthProvider } from "@domains/identity/contexts/AuthContext";
import { ModalsProvider } from "@mantine/modals";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/charts/styles.css";
import "@mantine/dates/styles.css";
import "./Global.css";
import "./Global.scss";
import { LayoutProvider } from "@/contexts/LayoutContext";
import { SearchProvider } from "@domains/discovery/contexts/SearchContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { useSettings } from "@/contexts/SettingsContext";
import { InteractionProvider } from "@/contexts/InteractionContext";
import { LandscapeProvider } from "@/contexts/LandscapeContext";
import { ErrorBoundary } from "react-error-boundary";
import Error from "./Error";
import { TourGuideProvider } from "@/contexts/TourGuideContext";
import { polyfill } from "mobile-drag-drop";
import { scrollBehaviourDragImageTranslateOverride } from "mobile-drag-drop/scroll-behaviour";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

polyfill({
  dragImageTranslateOverride: scrollBehaviourDragImageTranslateOverride,
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // Data is fresh for 5 minutes by default
      refetchOnWindowFocus: false, // Don't spam the server when tabbing back and forth
      retry: 1,
    },
  },
});

const Client = () => {
  return (
    <ErrorBoundary fallbackRender={(fallbackProps) => <Error {...fallbackProps} />}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <SettingsProvider>
              <SearchProvider>
                <LayoutProvider>
                  <LandscapeProvider>
                    <GraphProvider>
                      <WrapTheme>
                        <InteractionProvider>
                          <TourGuideProvider>
                            <App />
                          </TourGuideProvider>
                        </InteractionProvider>
                      </WrapTheme>
                    </GraphProvider>
                  </LandscapeProvider>
                </LayoutProvider>
              </SearchProvider>
            </SettingsProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  // <React.StrictMode>
  <Client />
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
