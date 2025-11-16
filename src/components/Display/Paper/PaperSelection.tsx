import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  ReactNode,
} from "react";
import {
  TextInput,
  Loader,
  Button,
  Group,
  ActionIcon,
  Text,
  Stack,
} from "@mantine/core";
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
};

type MenuProps = {
  children: ReactNode;
};

type FormProps = {
  children: ReactNode;
  title: string;
};

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
    }),
    [mode, searchQuery, formPrompt, onClose],
  );

  const menu = React.Children.toArray(children).find(
    (child) => React.isValidElement(child) && child.type === Menu,
  );
  const form = React.Children.toArray(children).find(
    (child) => React.isValidElement(child) && child.type === Form,
  );

  return (
    <PaperSelectionContext.Provider value={contextValue}>
      <Stack gap="xs">
        <div className={styles.inputContainer}>
          <input
            placeholder="Find or create..."
            value={searchQuery}
            onChange={(e) => handleSetQuery(e.currentTarget.value)}
            autoFocus
            className={styles.input}
          />
          <div className={styles.icon}>
            {isLoading ? <Loader size="xs" /> : <MagnifyingGlassIcon />}
          </div>
        </div>

        <div className={styles.root}>
          {mode === "search" && menu}
          {mode === "create" && form}
        </div>
      </Stack>
    </PaperSelectionContext.Provider>
  );
};

const Menu = ({ children }: MenuProps) => {
  const { searchQuery, formPrompt, setMode } = usePaperSelection();

  const hasChildren = React.Children.count(children) > 0;
  const hasQuery = searchQuery.trim().length > 0;
  const showMenu = hasChildren || hasQuery;

  console.log(
    "Children: ",
    hasChildren,
    React.Children.count(children),
    children,
  );

  if (!showMenu) return null;

  return (
    <div className={`${styles.panel} ${styles.menu}`}>
      <Stack gap="sm" style={{ width: "100%" }}>
        {children}

        {searchQuery.trim().length > 0 && (
          <>
            <div>
              <PaperButton
                leftSection={<PlusIcon weight="bold" />}
                onClick={() => setMode("create")}
              >
                {formPrompt(searchQuery)}
              </PaperButton>
            </div>
          </>
        )}
      </Stack>
    </div>
  );
};

const Form = ({ children, title }: FormProps) => {
  const { setMode } = usePaperSelection();

  return (
    <div className={`${styles.panel} ${styles.form}`}>
      <Stack gap="xs" style={{ width: "100%" }}>
        <Group justify="space-between">
          <ActionIcon
            variant="subtle"
            size="sm"
            color="gray"
            onClick={() => setMode("search")}
            className={styles.backButton}
          >
            <ArrowLeftIcon weight="bold" />
          </ActionIcon>
          <Text size="xs" c="dimmed" fw="bold">
            {title}
          </Text>
          <div style={{ width: 28 }} />
        </Group>

        {children}
      </Stack>
    </div>
  );
};

const Item = ({ id, name, description, onClick }: ItemProps) => {
  return (
    <div className={styles.item} onClick={onClick}>
      <span className={styles.name}>{name}</span>
      {description && <span className={styles.description}>{description}</span>}
    </div>
  );
};

// Assign compound components
PaperSelection.Menu = Menu;
PaperSelection.Form = Form;
PaperSelection.Item = Item;

export { PaperSelection };
