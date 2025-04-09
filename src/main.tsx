import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { theme } from "./theme.ts";
import { BrowserRouter } from "react-router";
import { GraphProvider } from "./contexts/GraphContext.tsx";
import { AuthProvider } from "./contexts/AuthContext.tsx";
import { ModalsProvider } from "@mantine/modals";
import "@mantine/tiptap/styles.css";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "./Global.scss";

const Client = () => {
  return (
    <BrowserRouter>
      <MantineProvider theme={theme} defaultColorScheme="dark">
        <Notifications position="bottom-right" />
        <ModalsProvider>
          <AuthProvider>
            <GraphProvider>
              <App />
            </GraphProvider>
          </AuthProvider>
        </ModalsProvider>
      </MantineProvider>
    </BrowserRouter>
  );
};

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Client />
  </React.StrictMode>,
);
