import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  Dispatch,
  SetStateAction,
  ComponentType,
} from "react";
import { useMediaQuery } from "@mantine/hooks";

export type ISidebarMode = "open" | "collapsed" | "compact" | "hovering";
export type IStatusBarMode = "hidden" | "showing";

type ILayoutContext = {
  elements: {
    leftSidebar: {
      mode: {
        get: ISidebarMode;
        set: (mode: ISidebarMode) => void;
        toggle: () => void;
        toggleAll: () => void;
      };
      content: {
        hasContent: boolean;
        setHasContent: Dispatch<SetStateAction<boolean>>;
      };
    };
    rightSidebar: {
      mode: {
        get: ISidebarMode;
        set: (mode: ISidebarMode) => void;
        toggle: () => void;
        toggleAll: () => void;
      };
      content: {
        hasContent: boolean;
        setHasContent: Dispatch<SetStateAction<boolean>>;
      };
    };
    statusBar: {
      mode: {
        get: IStatusBarMode;
        set: (mode: IStatusBarMode) => void;
        toggle: () => void;
        toggleAll: () => void;
      };
      message: {
        get: string | null;
        set: (message: string | null) => void;
      };
    };
  };
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isWideScreen: boolean;
  isUltraWide: boolean;
  isScrolled: boolean;
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
      content: {
        hasContent: false,
        setHasContent: () => {},
      },
    },
    rightSidebar: {
      mode: {
        get: "collapsed",
        set: () => {},
        toggle: () => {},
        toggleAll: () => {},
      },
      content: {
        hasContent: false,
        setHasContent: () => {},
      },
    },
    statusBar: {
      mode: {
        get: "hidden",
        set: () => {},
        toggle: () => {},
        toggleAll: () => {},
      },
      message: {
        get: null,
        set: () => {},
      },
    },
  },
  isMobile: false,
  isTablet: false,
  isDesktop: false,
  isWideScreen: false,
  isUltraWide: false,
  isScrolled: false,
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
  const [leftSidebarHasContent, setLeftSidebarHasContent] =
    useState<boolean>(false);
  const [leftSidebarHovering, setLeftSidebarHovering] =
    useState<boolean>(false);

  const [rightSidebarMode, setRightSidebarMode] =
    useState<ILayoutContext["elements"]["rightSidebar"]["mode"]["get"]>(
      "collapsed",
    );
  const [rightSidebarHasContent, setRightSidebarHasContent] =
    useState<boolean>(false);
  const [rightSidebarHovering, setRightSidebarHovering] =
    useState<boolean>(false);

  const [statusBarMode, setStatusbarMode] =
    useState<ILayoutContext["elements"]["statusBar"]["mode"]["get"]>("showing");
  const [statusBarMessage, setStatusbarMessage] =
    useState<ILayoutContext["elements"]["statusBar"]["message"]["get"]>(null);

  const [isScrolled, setIsScrolled] = useState<boolean>(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("leftSidebarMode", JSON.stringify(leftSidebarMode));
    }
  }, [leftSidebarMode]);

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
        "rightSidebarMode",
        JSON.stringify(rightSidebarMode),
      );
    }
  }, [rightSidebarMode]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "rightSidebarOpened",
        JSON.stringify(rightSidebarOpened),
      );
    }
  }, [rightSidebarOpened]);

  const isMobile = useMediaQuery("(max-width: 768px)") || false;
  const isTablet =
    useMediaQuery("(min-width: 769px) and (max-width: 1024px)") || false;
  const isDesktop =
    useMediaQuery("(min-width: 1025px) and (max-width: 1280px)") || false;
  const isWideScreen =
    useMediaQuery("(min-width: 1281px) and (max-width: 1440px)") || false;
  const isUltraWide = useMediaQuery("(min-width: 1441px)") || false;

  useEffect(() => {
    if (isMobile || isTablet) {
      if (leftSidebarMode === "open") {
        if (rightSidebarMode === "open") {
          setRightSidebarMode("collapsed");
        }
      }
    }
  }, [leftSidebarMode]);

  useEffect(() => {
    if (isMobile || isTablet) {
      if (rightSidebarMode === "open") {
        if (leftSidebarMode === "open") {
          setLeftSidebarMode("collapsed");
        }
      }
    }
  }, [rightSidebarMode]);

  const contextValue: ILayoutContext = {
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
        content: {
          hasContent: leftSidebarHasContent,
          setHasContent: setLeftSidebarHasContent,
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
        content: {
          hasContent: rightSidebarHasContent,
          setHasContent: setRightSidebarHasContent,
        },
      },
      statusBar: {
        mode: {
          get: statusBarMode,
          set: setStatusbarMode,
          toggle: () => {
            setStatusbarMode((prev) => {
              if (prev === "showing") {
                return "hidden";
              } else {
                return "showing";
              }
            });
          },
          toggleAll: () => {
            setStatusbarMode((prev) => {
              if (prev === "showing") {
                return "hidden";
              } else if (prev === "hidden") {
                return "showing";
              }
              return "hidden";
            });
          },
        },
        message: {
          get: statusBarMessage,
          set: setStatusbarMessage,
        },
      },
    },
    isMobile,
    isTablet,
    isDesktop,
    isWideScreen,
    isUltraWide,
    isScrolled,
  };

  return (
    <LayoutContext.Provider value={contextValue}>
      {children}
    </LayoutContext.Provider>
  );
};

export const useLayout = () => useContext(LayoutContext);
