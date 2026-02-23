import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useRef,
  useLayoutEffect,
  useCallback,
} from "react";
import styles from "./Pillbar.module.scss";

// 1. CONTEXT AND HOOK
// =================================================================

interface IPillbarContextProps {
  activeTab: string | null;
  setActiveTab: (value: string) => void;
}

const PillbarContext = createContext<IPillbarContextProps | undefined>(undefined);

const usePillbar = () => {
  const context = useContext(PillbarContext);
  if (!context) {
    throw new Error("usePillbar must be used within a Pillbar component");
  }
  return context;
};

// 2. CHILD COMPONENT DEFINITIONS
// =================================================================

interface IPillbarListProps {
  children: ReactNode;
}

const PillbarList = ({ children }: IPillbarListProps) => {
  const [pillStyle, setPillStyle] = useState({});
  const listRef = useRef<HTMLDivElement>(null);

  const updatePillStyle = useCallback((element: HTMLButtonElement) => {
    if (listRef.current) {
      const listRect = listRef.current.getBoundingClientRect();
      const tabRect = element.getBoundingClientRect();

      setPillStyle({
        left: tabRect.left - listRect.left,
        width: tabRect.width,
        height: tabRect.height,
      });
    }
  }, []);

  return (
    <div className={styles.pillbarList} ref={listRef}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            updatePillStyle,
          });
        }
        return child;
      })}
      <div className={styles.pill} style={pillStyle} />
    </div>
  );
};

interface IPillbarTabProps {
  value: string;
  leftSection?: ReactNode;
  children: ReactNode;
  updatePillStyle?: (element: HTMLButtonElement) => void;
}

const PillbarTab = ({ value, leftSection, children, updatePillStyle }: IPillbarTabProps) => {
  const { activeTab, setActiveTab } = usePillbar();
  const isActive = activeTab === value;
  const ref = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    if (isActive && ref.current && updatePillStyle) {
      const tabElement = ref.current;

      const observer = new ResizeObserver(() => {
        updatePillStyle(tabElement);
      });

      observer.observe(tabElement);

      // Also trigger an update immediately
      updatePillStyle(tabElement);

      return () => {
        observer.disconnect();
      };
    }
  }, [isActive, updatePillStyle]);

  return (
    <button
      ref={ref}
      onClick={() => setActiveTab(value)}
      className={`${styles.tab} ${isActive ? styles.tabActive : ""}`}
    >
      {leftSection && <span className={styles.tabLeftSection}>{leftSection}</span>}
      {children}
    </button>
  );
};

interface IPillbarPanelProps {
  value: string;
  children: ReactNode;
}

const PillbarPanel = ({ value, children }: IPillbarPanelProps) => {
  const { activeTab } = usePillbar();

  if (activeTab !== value) {
    return null;
  }

  return <div className={styles.tabPanel}>{children}</div>;
};

// 3. MAIN COMPONENT AND COMPOSITION
// =================================================================

interface IPillbarProps {
  defaultValue: string;
  children: ReactNode;
  onChange?: (value: string) => void;
  className?: string;
}

interface IPillbarComposition {
  List: typeof PillbarList;
  Tab: typeof PillbarTab;
  Panel: typeof PillbarPanel;
}

export const Pillbar: React.FC<IPillbarProps> & IPillbarComposition = ({
  defaultValue,
  children,
  onChange,
  className,
}) => {
  const [activeTab, setActiveTab] = useState<string>(defaultValue);

  const handleSetActiveTab = (value: string) => {
    setActiveTab(value);
    onChange?.(value);
  };

  return (
    <PillbarContext.Provider value={{ activeTab, setActiveTab: handleSetActiveTab }}>
      <div className={`${styles.pillbarContainer} ${className || ""}`}>{children}</div>
    </PillbarContext.Provider>
  );
};

Pillbar.List = PillbarList;
Pillbar.Tab = PillbarTab;
Pillbar.Panel = PillbarPanel;
