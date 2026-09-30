/*
 * Noeko Core
 * Copyright (C) 2026 Willow Web LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { BrowserRouter } from "react-router";
import { GraphProvider } from "@domains/constellation/contexts/GraphContext";
import { AuthProvider } from "@domains/identity/contexts/AuthContext";
import { ModalsProvider } from "@mantine/modals";
import { I18nProvider } from "@lingui/react";
import { i18n } from "@lingui/core";
import "./i18n";
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
        <I18nProvider i18n={i18n}>
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
        </I18nProvider>
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
        scheme: { actual: actualScheme },
      },
    },
  } = useSettings();

  return (
    <MantineProvider
      theme={theme.override}
      defaultColorScheme={actualScheme}
      forceColorScheme={actualScheme}
    >
      <ModalsProvider>
        <Notifications position="bottom-right" />
        {children}
      </ModalsProvider>
    </MantineProvider>
  );
}
