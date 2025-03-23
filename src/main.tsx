import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { theme } from "./theme.ts";
import { BrowserRouter } from "react-router";
import { AlertProvider } from "./contexts/AlertContext.tsx";
import "@mantine/tiptap/styles.css";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "./Global.scss";

const Client = () => {
  return (
    <BrowserRouter>
      <MantineProvider theme={theme} defaultColorScheme="dark">
        <AlertProvider>
          <Notifications position="top-right" />
        </AlertProvider>
        <App />
      </MantineProvider>
    </BrowserRouter>
  );
};

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Client />
  </React.StrictMode>,
);
