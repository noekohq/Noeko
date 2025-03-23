import React, { createContext, useContext, useMemo, useState } from "react";

interface AlertState {
  title: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
  open: boolean;
}

const initialAlertState: AlertState = {
  title: "",
  message: "",
  type: "success",
  open: false,
};

interface AlertContextState {
  alert: AlertState;
  setAlert: (
    alert: Omit<AlertState, "open">,
    timeout?: number | "none",
  ) => void;
  clearAlert: () => void;
}

const AlertContext = createContext<AlertContextState>({
  alert: initialAlertState,
  setAlert: () => {},
  clearAlert: () => {},
});

export function AlertProvider({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const [alert, setAlert] = useState<AlertState>(initialAlertState);

  const handleSetAlert = (
    alert: Omit<AlertState, "open">,
    timeout: number | "none" = 5000,
  ) => {
    setAlert({
      ...alert,
      open: true,
    });

    if (timeout === "none") {
      return;
    }
    setTimeout(() => {
      setAlert({
        ...alert,
        open: false,
      });
    }, timeout);
  };

  const clearAlert = () => {
    setAlert(initialAlertState);
  };

  const value = useMemo(
    () => ({
      alert,
      setAlert: handleSetAlert,
      clearAlert,
    }),
    [alert, setAlert, clearAlert],
  );

  return (
    <AlertContext.Provider value={value}>{children}</AlertContext.Provider>
  );
}

export const useAlert = () => useContext(AlertContext);
