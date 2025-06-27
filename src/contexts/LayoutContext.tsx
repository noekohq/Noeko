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
  setOpened: Dispatch<SetStateAction<boolean>>;
};

type ISidebarMode = "open" | "collapsed" | "compact";

type ILayoutContext = {
  elements: {
    leftSidebar: {
      mode: {
        get: ISidebarMode;
        set: (mode: ISidebarMode) => void;
        toggle: () => void;
        toggleAll: () => void;
      };
    };
    rightSidebar: {
      mode: {
        get: ISidebarMode;
        set: (mode: ISidebarMode) => void;
        toggle: () => void;
        toggleAll: () => void;
      };
    };
  };
  leftSidebar: SidebarState;
  rightSidebar: SidebarState;
  isMobile: boolean;
};

const initialLayoutContext: ILayoutContext = {
  elements: {
    leftSidebar: {
      mode: {
        get: "collapsed",
        set: () => {},
        toggle: () => {},
        toggleAll: () => {},
      },
    },
    rightSidebar: {
      mode: {
        get: "collapsed",
        set: () => {},
        toggle: () => {},
        toggleAll: () => {},
      },
    },
  },
  leftSidebar: {
    opened: false,
    setOpened: () => {},
  },
  rightSidebar: {
    opened: false,
    setOpened: () => {},
  },
  isMobile: false,
};

const LayoutContext = createContext<ILayoutContext>(initialLayoutContext);

const getInitialSidebarState = (
  key: string,
  defaultValue: boolean,
): boolean => {
  if (typeof window === "undefined") {
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

  const [leftSidebarMode, setLeftSidebarMode] =
    useState<ILayoutContext["elements"]["leftSidebar"]["mode"]["get"]>(
      "collapsed",
    );
  const [rightSidebarMode, setRightSidebarMode] =
    useState<ILayoutContext["elements"]["rightSidebar"]["mode"]["get"]>(
      "collapsed",
    );

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "leftSidebarOpened",
        JSON.stringify(leftSidebarOpened),
      );
    }
  }, [leftSidebarOpened]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "rightSidebarOpened",
        JSON.stringify(rightSidebarOpened),
      );
    }
  }, [rightSidebarOpened]);

  const isMobile = useMediaQuery("(max-width: 1028px)") || false;

  const contextValue = useMemo<ILayoutContext>(
    () => ({
      elements: {
        leftSidebar: {
          mode: {
            get: leftSidebarMode,
            set: setLeftSidebarMode,
            toggle: () => {
              setLeftSidebarMode((prev) => {
                if (prev === "open") {
                  return "collapsed";
                } else {
                  return "open";
                }
              });
            },
            toggleAll: () => {
              setLeftSidebarMode((prev) => {
                if (prev === "open") {
                  return "compact";
                } else if (prev === "collapsed") {
                  return "open";
                }
                return "collapsed";
              });
            },
          },
        },
        rightSidebar: {
          mode: {
            get: rightSidebarMode,
            set: setRightSidebarMode,
            toggle: () => {
              setRightSidebarMode((prev) => {
                if (prev === "open") {
                  return "collapsed";
                } else {
                  return "open";
                }
              });
            },
            toggleAll: () => {
              setRightSidebarMode((prev) => {
                if (prev === "open") {
                  return "compact";
                } else if (prev === "collapsed") {
                  return "open";
                }
                return "collapsed";
              });
            },
          },
        },
      },
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
    [
      leftSidebarOpened,
      rightSidebarOpened,
      isMobile,
      leftSidebarMode,
      rightSidebarMode,
    ],
  );

  return (
    <LayoutContext.Provider value={contextValue}>
      {children}
    </LayoutContext.Provider>
  );
};

export const useLayout = () => useContext(LayoutContext);
