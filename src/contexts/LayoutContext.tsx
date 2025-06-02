import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useMemo,
  Dispatch,
  SetStateAction,
} from "react";
import { useMediaQuery } from "@mantine/hooks";

type SidebarState = {
  opened: boolean;
  setOpened: Dispatch<SetStateAction<boolean>>; // More precise type for useState setter
};

type ILayoutContext = {
  leftSidebar: SidebarState;
  rightSidebar: SidebarState;
  isMobile: boolean;
};

// Initial context values are defaults/placeholders;
// the Provider will supply the actual state and functions.
const initialLayoutContext: ILayoutContext = {
  leftSidebar: {
    opened: false, // Default if no localStorage and before provider initializes
    setOpened: () => {}, // Placeholder
  },
  rightSidebar: {
    opened: false, // Default if no localStorage and before provider initializes
    setOpened: () => {}, // Placeholder
  },
  isMobile: false,
};

const LayoutContext = createContext<ILayoutContext>(initialLayoutContext);

// Helper function to get initial state from localStorage
const getInitialSidebarState = (
  key: string,
  defaultValue: boolean,
): boolean => {
  if (typeof window === "undefined") {
    // SSR safety: localStorage is not available on the server
    return defaultValue;
  }
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.warn(`Error reading localStorage key "${key}":`, error);
    return defaultValue;
  }
};

export const LayoutProvider = ({ children }: { children: React.ReactNode }) => {
  const [leftSidebarOpened, setLeftSidebarOpened] = useState<boolean>(
    () => getInitialSidebarState("leftSidebarOpened", false), // Default to false if nothing in localStorage
  );

  const [rightSidebarOpened, setRightSidebarOpened] = useState<boolean>(
    () => getInitialSidebarState("rightSidebarOpened", false), // Default to false if nothing in localStorage
  );

  // Effect to save left sidebar state to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "leftSidebarOpened",
        JSON.stringify(leftSidebarOpened),
      );
    }
  }, [leftSidebarOpened]);

  // Effect to save right sidebar state to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "rightSidebarOpened",
        JSON.stringify(rightSidebarOpened),
      );
    }
  }, [rightSidebarOpened]);

  const isMobile = useMediaQuery("(max-width: 1028px)") || false;

  // Memoize the context value to prevent unnecessary re-renders of consumers
  // The setOpened functions from useState are stable and don't need to be in the deps array
  // if we are constructing a new object for the value each time, but for clarity and
  // best practice with objects in context, useMemo is good.
  const contextValue = useMemo<ILayoutContext>(
    () => ({
      leftSidebar: {
        opened: leftSidebarOpened,
        setOpened: setLeftSidebarOpened,
      },
      rightSidebar: {
        opened: rightSidebarOpened,
        setOpened: setRightSidebarOpened,
      },
      isMobile,
    }),
    [leftSidebarOpened, rightSidebarOpened, isMobile],
  );
  // Note: setLeftSidebarOpened and setRightSidebarOpened (the functions themselves)
  // are guaranteed by React to be stable, so they don't strictly need to be dependencies
  // for the useMemo if the structure of the value object isn't changing their role.
  // However, `isMobile`, `leftSidebarOpened`, `rightSidebarOpened` are the actual values that drive changes.

  return (
    <LayoutContext.Provider value={contextValue}>
      {children}
    </LayoutContext.Provider>
  );
};

export const useLayout = () => useContext(LayoutContext);
