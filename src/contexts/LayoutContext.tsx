import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  Dispatch,
  SetStateAction,
  ComponentType,
  useRef,
  useCallback,
  useMemo,
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
    nav: {
      drawer: {
        isOpen: boolean;
        setIsOpen: (isOpen: boolean) => void;
        toggle: () => void;
        hasContent: boolean;
        setHasContent: (hasContent: boolean) => void;
      };
    };
    mobileEditorToolbar: {
      isVisible: boolean;
      setIsVisible: (isVisible: boolean) => void;
    };
  };
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isWideScreen: boolean;
  isUltraWide: boolean;
};

type ILayoutScrollContext = {
  isScrolled: boolean;
  scrollDirection: "up" | "down";
  check: () => void;
};

type ILayoutScrollRegistrationContext = {
  setScrollableElement: Dispatch<SetStateAction<HTMLElement | null>>;
};

type ILayoutViewportContext = Pick<
  ILayoutContext,
  "isMobile" | "isTablet" | "isDesktop" | "isWideScreen" | "isUltraWide"
>;

type ILayoutSidebarActionsContext = {
  setLeftSidebarMode: (mode: ISidebarMode) => void;
  setRightSidebarMode: (mode: ISidebarMode) => void;
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
    nav: {
      drawer: {
        isOpen: false,
        setIsOpen: () => {},
        toggle: () => {},
        hasContent: false,
        setHasContent: () => {},
      },
    },
    mobileEditorToolbar: {
      isVisible: false,
      setIsVisible: () => {},
    },
  },
  isMobile: false,
  isTablet: false,
  isDesktop: false,
  isWideScreen: false,
  isUltraWide: false,
};

const LayoutContext = createContext<ILayoutContext>(initialLayoutContext);
const LayoutScrollContext = createContext<ILayoutScrollContext>({
  isScrolled: false,
  scrollDirection: "up",
  check: () => {},
});
const LayoutScrollRegistrationContext = createContext<ILayoutScrollRegistrationContext>({
  setScrollableElement: () => {},
});
const LayoutViewportContext = createContext<ILayoutViewportContext>({
  isMobile: false,
  isTablet: false,
  isDesktop: false,
  isWideScreen: false,
  isUltraWide: false,
});
const LayoutSidebarActionsContext = createContext<ILayoutSidebarActionsContext>({
  setLeftSidebarMode: () => {},
  setRightSidebarMode: () => {},
});

const getInitialSidebarState = (key: string, defaultValue: boolean): boolean => {
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
    () => getInitialSidebarState("leftSidebarOpened", false) // Default to false if nothing in localStorage
  );
  const [rightSidebarOpened, setRightSidebarOpened] = useState<boolean>(
    () => getInitialSidebarState("rightSidebarOpened", false) // Default to false if nothing in localStorage
  );

  const [leftSidebarMode, setLeftSidebarMode] =
    useState<ILayoutContext["elements"]["leftSidebar"]["mode"]["get"]>("collapsed");
  const [leftSidebarHasContent, setLeftSidebarHasContent] = useState<boolean>(false);
  const [leftSidebarHovering, setLeftSidebarHovering] = useState<boolean>(false);

  const [rightSidebarMode, setRightSidebarMode] =
    useState<ILayoutContext["elements"]["rightSidebar"]["mode"]["get"]>("collapsed");
  const [rightSidebarHasContent, setRightSidebarHasContent] = useState<boolean>(false);
  const [rightSidebarHovering, setRightSidebarHovering] = useState<boolean>(false);

  const [navDrawerHasContent, setNavDrawerHasContent] = useState(false);
  const [navDrawerIsOpen, setNavDrawerIsOpen] = useState(false);

  const [mobileEditorToolbarVisible, setMobileEditorToolbarVisible] = useState(false);

  const [statusBarMode, setStatusbarMode] =
    useState<ILayoutContext["elements"]["statusBar"]["mode"]["get"]>("showing");
  const [statusBarMessage, setStatusbarMessage] =
    useState<ILayoutContext["elements"]["statusBar"]["message"]["get"]>(null);

  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  const [scrollDirection, setScrollDirection] = useState<"up" | "down">("up");
  const [scrollableElement, setScrollableElement] = useState<HTMLElement | null>(null);
  const lastScrollPosition = useRef(0);

  const handleScroll = useCallback(() => {
    if (!scrollableElement) return;
    const direction = scrollableElement.scrollTop > lastScrollPosition.current ? "down" : "up";
    setIsScrolled(scrollableElement.scrollTop > 0);
    setScrollDirection(direction);
    lastScrollPosition.current = scrollableElement.scrollTop;
  }, [scrollableElement]);

  useEffect(() => {
    if (!scrollableElement) return;

    scrollableElement.addEventListener("scroll", handleScroll);

    return () => {
      scrollableElement.removeEventListener("scroll", handleScroll);
    };
  }, [scrollableElement, handleScroll]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("leftSidebarMode", JSON.stringify(leftSidebarMode));
    }
  }, [leftSidebarMode]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("leftSidebarOpened", JSON.stringify(leftSidebarOpened));
    }
  }, [leftSidebarOpened]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("rightSidebarMode", JSON.stringify(rightSidebarMode));
    }
  }, [rightSidebarMode]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("rightSidebarOpened", JSON.stringify(rightSidebarOpened));
    }
  }, [rightSidebarOpened]);

  const isMobile = useMediaQuery("(max-width: 768px)") || false;
  const isTablet = useMediaQuery("(min-width: 769px) and (max-width: 1024px)") || false;
  const isDesktop = useMediaQuery("(min-width: 1025px) and (max-width: 1280px)") || false;
  const isWideScreen = useMediaQuery("(min-width: 1281px) and (max-width: 1440px)") || false;
  const isUltraWide = useMediaQuery("(min-width: 1441px)") || false;

  useEffect(() => {
    if (isMobile || isTablet) {
      if (leftSidebarMode === "open") {
        if (rightSidebarMode === "open") {
          setRightSidebarMode("collapsed");
        }
      }
    }
  }, [isMobile, isTablet, leftSidebarMode, rightSidebarMode]);

  useEffect(() => {
    if (isMobile || isTablet) {
      if (rightSidebarMode === "open") {
        if (leftSidebarMode === "open") {
          setLeftSidebarMode("collapsed");
        }
      }
    }
  }, [isMobile, isTablet, leftSidebarMode, rightSidebarMode]);

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
        nav: {
          drawer: {
            isOpen: navDrawerIsOpen,
            setIsOpen: setNavDrawerIsOpen,
            toggle: () => setNavDrawerIsOpen((prev) => !prev),
            hasContent: navDrawerHasContent,
            setHasContent: setNavDrawerHasContent,
          },
        },
        mobileEditorToolbar: {
          isVisible: mobileEditorToolbarVisible,
          setIsVisible: setMobileEditorToolbarVisible,
        },
      },
      isMobile,
      isTablet,
      isDesktop,
      isWideScreen,
      isUltraWide,
    }),
    [
      leftSidebarMode,
      leftSidebarHasContent,
      rightSidebarMode,
      rightSidebarHasContent,
      statusBarMode,
      statusBarMessage,
      navDrawerIsOpen,
      navDrawerHasContent,
      mobileEditorToolbarVisible,
      isMobile,
      isTablet,
      isDesktop,
      isWideScreen,
      isUltraWide,
    ]
  );

  const scrollValue = useMemo<ILayoutScrollContext>(
    () => ({
      isScrolled,
      scrollDirection,
      check: handleScroll,
    }),
    [isScrolled, scrollDirection, handleScroll]
  );

  const viewportValue = useMemo<ILayoutViewportContext>(
    () => ({ isMobile, isTablet, isDesktop, isWideScreen, isUltraWide }),
    [isMobile, isTablet, isDesktop, isWideScreen, isUltraWide]
  );

  const sidebarActionsValue = useMemo<ILayoutSidebarActionsContext>(
    () => ({ setLeftSidebarMode, setRightSidebarMode }),
    []
  );
  const scrollRegistrationValue = useMemo<ILayoutScrollRegistrationContext>(
    () => ({ setScrollableElement }),
    []
  );

  return (
    <LayoutContext.Provider value={contextValue}>
      <LayoutViewportContext.Provider value={viewportValue}>
        <LayoutSidebarActionsContext.Provider value={sidebarActionsValue}>
          <LayoutScrollRegistrationContext.Provider value={scrollRegistrationValue}>
            <LayoutScrollContext.Provider value={scrollValue}>
              {children}
            </LayoutScrollContext.Provider>
          </LayoutScrollRegistrationContext.Provider>
        </LayoutSidebarActionsContext.Provider>
      </LayoutViewportContext.Provider>
    </LayoutContext.Provider>
  );
};

export const useLayout = () => useContext(LayoutContext);
export const useLayoutScroll = () => useContext(LayoutScrollContext);
export const useLayoutScrollRegistration = () => useContext(LayoutScrollRegistrationContext);
export const useLayoutViewport = () => useContext(LayoutViewportContext);
export const useLayoutSidebarActions = () => useContext(LayoutSidebarActionsContext);
