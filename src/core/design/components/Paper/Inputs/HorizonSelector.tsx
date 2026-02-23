import React, { createContext, useContext, useState, useMemo, ReactNode } from "react";
import { ActionIcon, Text, TextInput, Group } from "@mantine/core";
import { DatePicker } from "@mantine/dates";
import { ArrowLeftIcon, CalendarPlusIcon, ClockIcon, XCircleIcon } from "@phosphor-icons/react";
import styles from "./HorizonSelector.module.scss";
import { Duration } from "surrealdb";
import { fromYYYYMMDD, toYYYYMMDD } from '@core/utils/datetime';

// --- Types ---

type SelectorType = "date" | "duration";
type Mode = "presets" | "custom";

interface IHorizonContext {
  type: SelectorType;
  value: string | null;
  onChange: (val: string | null) => void;
  mode: Mode;
  setMode: (mode: Mode) => void;
}

// --- Context ---

const HorizonContext = createContext<IHorizonContext | null>(null);

export const useHorizonSelection = () => {
  const context = useContext(HorizonContext);
  if (!context) {
    throw new Error("useHorizonSelection must be used within a HorizonSelector provider");
  }
  return context;
};

// --- Main Component ---

interface HorizonSelectorProps {
  type: SelectorType;
  value: string | null;
  onChange: (val: string | null) => void;
  children?: ReactNode; // Optional if you want to inject custom children, though we provide defaults
}

const HorizonSelector = ({ type, value, onChange, children }: HorizonSelectorProps) => {
  const [mode, setMode] = useState<Mode>("presets");

  const contextValue = useMemo(
    () => ({
      type,
      value,
      onChange,
      mode,
      setMode,
    }),
    [type, value, onChange, mode]
  );

  // If no children provided, use the default implementation logic
  const content = children || (
    <>
      {mode === "presets" && <Presets />}
      {mode === "custom" && <CustomForm />}
    </>
  );

  return (
    <HorizonContext.Provider value={contextValue}>
      <div className={styles.wrapper}>{content}</div>
    </HorizonContext.Provider>
  );
};

// --- Sub-Components ---

// 1. Item (The Card)
interface ItemProps {
  label: string;
  sub?: string;
  active?: boolean;
  onClick?: () => void;
  isCustomTrigger?: boolean;
}

const Item = ({ label, sub, active, onClick, isCustomTrigger }: ItemProps) => {
  return (
    <div
      className={`${styles.item} ${isCustomTrigger ? styles.customTrigger : ""}`}
      data-active={active}
      onClick={onClick}
    >
      {isCustomTrigger ? (
        // Centered layout for custom trigger
        <>
          <CalendarPlusIcon size={20} />
          <Text className={styles.description}>{label}</Text>
        </>
      ) : (
        <>
          <Text className={styles.label}>{label}</Text>
          {sub && <Text className={styles.description}>{sub}</Text>}
        </>
      )}
    </div>
  );
};

// 2. Presets (The Horizontal List)
const Presets = () => {
  const { type, value, onChange, setMode } = useHorizonSelection();

  // Generate Options Logic
  const options = useMemo(() => {
    if (type === "duration") {
      return [
        { label: "Quick", value: "15m", sub: "15m" },
        { label: "Short", value: "30m", sub: "30m" },
        { label: "Medium", value: "1h", sub: "60m" },
        { label: "Focus", value: "2h", sub: "120m" },
        { label: "Deep", value: "4h", sub: "4 hours" },
        { label: "Full", value: "1d", sub: "8 hours" },
      ];
    }

    // Date Logic
    const today = new Date();
    const opts: { label: string; value: string; sub: string }[] = [];

    const addOpt = (d: Date, label: string, sub: string) => {
      opts.push({ label, value: toYYYYMMDD(d), sub });
    };

    addOpt(today, "Today", "Do it now");

    const tmrw = new Date(today);
    tmrw.setDate(today.getDate() + 1);
    addOpt(tmrw, "Tomorrow", "Plan ahead");

    const sat = new Date(today);
    sat.setDate(today.getDate() + ((6 - today.getDay() + 7) % 7));
    if (toYYYYMMDD(sat) !== toYYYYMMDD(today) && toYYYYMMDD(sat) !== toYYYYMMDD(tmrw)) {
      addOpt(sat, "Weekend", "Saturday");
    }

    const mon = new Date(today);
    mon.setDate(today.getDate() + ((1 + 7 - today.getDay()) % 7));
    if (toYYYYMMDD(mon) > toYYYYMMDD(tmrw)) {
      addOpt(mon, "Next Week", "Monday");
    }

    return opts;
  }, [type]);

  const isCustomValue = value && !options.some((o) => o.value === value);

  return (
    <div className={styles.track}>
      {/* "None" Option */}
      <Item label="None" sub="Clear" active={value === null} onClick={() => onChange(null)} />

      {/* Generated Options */}
      {options.map((opt) => (
        <Item
          key={opt.value}
          label={opt.label}
          sub={opt.sub}
          active={value === opt.value}
          onClick={() => onChange(value === opt.value ? null : opt.value)}
        />
      ))}

      {/* Custom Trigger */}
      <Item
        label="Custom"
        isCustomTrigger
        active={!!isCustomValue}
        onClick={() => setMode("custom")}
      />
    </div>
  );
};

// 3. Custom Form (The detailed view that replaces the list)
const CustomForm = () => {
  const { type, value, onChange, setMode } = useHorizonSelection();

  return (
    <div className={styles.form}>
      {/* Header with Back Button */}
      <div className={styles.formHeader}>
        <ActionIcon
          variant="transparent"
          size="sm"
          color="dimmed"
          onClick={() => setMode("presets")}
          className={styles.backButton}
        >
          <ArrowLeftIcon weight="bold" />
        </ActionIcon>
        <Text size="sm" fw={600}>
          Select {type === "date" ? "Date" : "Duration"}
        </Text>
      </div>

      {/* Content Body */}
      {type === "date" ? (
        <Group justify="center">
          <DatePicker
            value={value ? fromYYYYMMDD(value) : null}
            onChange={(date) => {
              if (date) {
                onChange(toYYYYMMDD(new Date(date)));
                setMode("presets"); // Auto-close on select
              }
            }}
          />
        </Group>
      ) : (
        <TextInput
          placeholder="e.g. 2h 30m"
          defaultValue={value || ""}
          autoFocus
          rightSection={
            <ActionIcon variant="subtle" onClick={() => onChange(null)}>
              <XCircleIcon />
            </ActionIcon>
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              try {
                const val = e.currentTarget.value;
                // Validate duration
                new Duration(val);
                onChange(val);
                setMode("presets");
              } catch (err) {
                // Handle invalid duration
              }
            }
          }}
        />
      )}
    </div>
  );
};

// --- Attachments ---
HorizonSelector.Item = Item;
HorizonSelector.Presets = Presets;
HorizonSelector.CustomForm = CustomForm;

export default HorizonSelector;
