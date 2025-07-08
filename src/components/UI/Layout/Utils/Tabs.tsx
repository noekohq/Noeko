import React, { createContext, useContext, useState, ReactNode } from "react";
import styles from "./Tabs.module.scss";

// 1. CONTEXT AND HOOK (No changes here)
// =================================================================

interface ITabsContextProps {
  activeTab: string | null;
  setActiveTab: (value: string) => void;
}

const TabsContext = createContext<ITabsContextProps | undefined>(undefined);

const useTabs = () => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error("useTabs must be used within a Tabs component");
  }
  return context;
};

// 2. CHILD COMPONENT DEFINITIONS (The Fix)
// =================================================================
// Define sub-components as standalone, top-level constants.
// This gives them a stable identity across fast refreshes.

interface ITabsListProps {
  children: ReactNode;
}

const TabsList = ({ children }: ITabsListProps) => {
  return <div className={styles.tabsList}>{children}</div>;
};

interface ITabsTabProps {
  value: string;
  leftSection?: ReactNode;
  children: ReactNode;
}

const TabsTab = ({ value, leftSection, children }: ITabsTabProps) => {
  const { activeTab, setActiveTab } = useTabs();
  const isActive = activeTab === value;

  return (
    <button
      onClick={() => setActiveTab(value)}
      className={`${styles.tab} ${isActive ? styles.tabActive : ""}`}
    >
      {leftSection && (
        <span className={styles.tabLeftSection}>{leftSection}</span>
      )}
      {children}
    </button>
  );
};

interface ITabsPanelProps {
  value: string;
  children: ReactNode;
}

const TabsPanel = ({ value, children }: ITabsPanelProps) => {
  const { activeTab } = useTabs();

  if (activeTab !== value) {
    return null;
  }

  return <div className={styles.tabPanel}>{children}</div>;
};

// 3. MAIN COMPONENT AND COMPOSITION
// =================================================================

interface ITabsProps {
  defaultValue: string;
  children: ReactNode;
  onChange?: (value: string) => void;
}

// Define an interface for the composed component for better TypeScript support
interface ITabsComposition {
  List: typeof TabsList;
  Tab: typeof TabsTab;
  Panel: typeof TabsPanel;
}

export const Tabs: React.FC<ITabsProps> & ITabsComposition = ({
  defaultValue,
  children,
  onChange,
}) => {
  const [activeTab, setActiveTab] = useState<string>(defaultValue);

  const handleSetActiveTab = (value: string) => {
    setActiveTab(value);
    onChange?.(value);
  };

  return (
    <TabsContext.Provider
      value={{ activeTab, setActiveTab: handleSetActiveTab }}
    >
      <div className={styles.tabsContainer}>{children}</div>
    </TabsContext.Provider>
  );
};

// Attach the stable child components as properties to the main component
Tabs.List = TabsList;
Tabs.Tab = TabsTab;
Tabs.Panel = TabsPanel;
