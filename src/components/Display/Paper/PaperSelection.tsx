import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  ReactNode,
} from "react";
import { Loader, ActionIcon, Text } from "@mantine/core";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  ArrowLeftIcon,
} from "@phosphor-icons/react";
import styles from "./PaperSelection.module.scss";
import PaperButton from "./PaperButton";

const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
};

interface IPaperSelectionContext {
  mode: "search" | "create";
  setMode: (mode: "search" | "create") => void;
  searchQuery: string;
  formPrompt: (query: string) => string;
  onClose: () => void;
  allowCreation: boolean; // Added to context
}

const PaperSelectionContext = createContext<IPaperSelectionContext | null>(
  null,
);

export const usePaperSelection = () => {
  const context = useContext(PaperSelectionContext);
  if (!context) {
    throw new Error(
      "usePaperSelection must be used within a PaperSelection provider",
    );
  }
  return context;
};

type PaperSelectionProps = {
  children: ReactNode;
  onSearch: (query: string) => void;
  onClear: () => void;
  onClose: () => void;
  formPrompt: (query: string) => string;
  isLoading?: boolean;
  placeholder?: string;
  allowCreation?: boolean;
};

type MenuProps = { children: ReactNode };
type FormProps = { children: ReactNode; title: string };
type ItemProps = {
  id: string;
  name: string;
  description?: string;
  onClick?: () => void;
};

const PaperSelection = ({
  children,
  onSearch,
  onClear,
  onClose,
  formPrompt,
  isLoading,
  placeholder = "Find or create...",
  allowCreation = true, // Defaulting to true preserves existing behavior
}: PaperSelectionProps) => {
  const [mode, setMode] = useState<"search" | "create">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    onSearch(debouncedQuery);
  }, [debouncedQuery, onSearch]);

  const handleSetQuery = (val: string) => {
    setSearchQuery(val);
    if (mode === "create") {
      setMode("search");
    }
  };

  const contextValue = useMemo(
    () => ({
      mode,
      setMode,
      searchQuery,
      formPrompt,
      onClose,
      allowCreation,
    }),
    [mode, searchQuery, formPrompt, onClose, allowCreation],
  );

  const menu = React.Children.toArray(children).find(
    (child) => React.isValidElement(child) && child.type === Menu,
  );
  const form = React.Children.toArray(children).find(
    (child) => React.isValidElement(child) && child.type === Form,
  );

  return (
    <PaperSelectionContext.Provider value={contextValue}>
      <div className={styles.wrapper}>
        {/* Sticky Header / Input */}
        {mode === "search" && (
          <div className={styles.inputContainer}>
            <input
              placeholder={placeholder}
              value={searchQuery}
              onChange={(e) => handleSetQuery(e.currentTarget.value)}
              autoFocus
              className={styles.input}
            />
            <div className={styles.icon}>
              {isLoading ? (
                <Loader size={16} color="gray" />
              ) : (
                <MagnifyingGlassIcon size={16} />
              )}
            </div>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className={styles.contentScroll}>
          {mode === "search" && menu}
          {mode === "create" && form}
        </div>
      </div>
    </PaperSelectionContext.Provider>
  );
};

const Menu = ({ children }: MenuProps) => {
  // Destructure allowCreation from context
  const { searchQuery, formPrompt, setMode, allowCreation } =
    usePaperSelection();

  const hasQuery = searchQuery.trim().length > 0;

  return (
    <div className={styles.menu}>
      {children}

      {hasQuery && allowCreation && (
        <div className={styles.createAction}>
          <PaperButton
            leftSection={<PlusIcon weight="bold" />}
            onClick={() => setMode("create")}
            fullWidth
          >
            {formPrompt(searchQuery)}
          </PaperButton>
        </div>
      )}
    </div>
  );
};

const Form = ({ children, title }: FormProps) => {
  const { setMode } = usePaperSelection();

  return (
    <div className={styles.form}>
      <div className={styles.formHeader}>
        <ActionIcon
          variant="transparent"
          size="sm"
          color="dimmed"
          onClick={() => setMode("search")}
          className={styles.backButton}
        >
          <ArrowLeftIcon weight="bold" />
        </ActionIcon>
        <Text size="sm" fw={600}>
          {title}
        </Text>
      </div>

      {children}
    </div>
  );
};

const Item = ({ id, name, description, onClick }: ItemProps) => {
  return (
    <div className={styles.item} onClick={onClick}>
      <Text className={styles.name}>{name}</Text>
      {description && <Text className={styles.description}>{description}</Text>}
    </div>
  );
};

PaperSelection.Menu = Menu;
PaperSelection.Form = Form;
PaperSelection.Item = Item;

export { PaperSelection };
