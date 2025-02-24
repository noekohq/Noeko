import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { theme } from "./theme.ts";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import { BrowserRouter } from "react-router";

const Client = () => {
  return (
    <BrowserRouter>
      <MantineProvider theme={theme} defaultColorScheme="dark">
        <Notifications position="top-right" />
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
