import { ActionIcon, Button, Group, Select, Text } from "@mantine/core";
import styles from "./Textbox.module.scss";
import {
  GlobeSimpleIcon,
  LightbulbIcon,
  PaperPlaneIcon,
  PaperPlaneRightIcon,
  RabbitIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLayout } from "../../contexts/LayoutContext";
import useRabbithole from "../../hooks/useRabbithole";
import { ISpyglassScopeOption } from "../../../app/services/Spyglass";
import Selection from "../../components/Display/Interactions/Selection";
import { SpyglassIcon } from "../../components/Utils/Icons/Icons";

interface ITextboxProps {
  onSubmit: (query: string) => void;
  onChange: (value: string) => void;
  value: string;
  placeholder?: string;
  placeholderIfInitialized?: string;
  initialized?: boolean;
}

export default function Textbox({
  onSubmit,
  onChange,
  value,
  placeholder,
  placeholderIfInitialized,
  initialized,
}: ITextboxProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [sendingAnimation, setSendingAnimation] = useState(false);

  const send = () => {
    setSendingAnimation(true);
    onSubmit(value);
    inputRef.current?.blur();
  };

  useEffect(() => {
    if (sendingAnimation) {
      setTimeout(() => setSendingAnimation(false), 1000);
    }
  }, [sendingAnimation]);

  const [isFocused, setIsFocused] = useState(false);

  useLayoutEffect(() => {
    if (!isFocused && !initialized) {
      inputRef.current?.focus();
    }
    document.addEventListener("keydown", (event) => {
      if (inputRef.current && event.key === "/") {
        if (!isFocused) {
          event.preventDefault();
          inputRef.current.focus();
        }
      }
    });
  }, [initialized]);

  const showUI = () => {
    if (initialized && !isFocused) {
      return false;
    }
    return true;
  };

  const { isDownRabbithole, currentRabbithole, exitRabbithole } =
    useRabbithole();

  const [scope, setScope] = useState<ISpyglassScopeOption>("my-qwest");

  return (
    <div
      className={`${styles.textbox} ${isFocused ? styles.focused : ""} ${initialized ? styles.initialized : ""}`}
      onClick={() => {
        if (!isFocused) {
          inputRef.current?.focus();
        }
      }}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
    >
      <textarea
        placeholder={initialized ? placeholderIfInitialized : placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.currentTarget.value);
        }}
        ref={inputRef}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
          }
          if (inputRef.current && e.key === "Escape") {
            if (isFocused) {
              inputRef.current.blur();
            }
          }
        }}
      />
      {showUI() && (
        <div className={styles.ui}>
          <Group justify="start">
            {isDownRabbithole && (
              <Button
                radius="xl"
                size="xs"
                variant="light"
                color="green"
                rightSection={
                  <>
                    <ActionIcon
                      variant="subtle"
                      onClick={(e) => {
                        e.stopPropagation();
                        exitRabbithole();
                      }}
                      size="sm"
                      color="green"
                    >
                      <XIcon weight="bold" />
                    </ActionIcon>
                  </>
                }
              >
                <Group gap="2px" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                  <RabbitIcon weight="fill" />
                  <Text
                    w={"100%"}
                    truncate={"end"}
                    size="xs"
                    tt="uppercase"
                    fw="bold"
                    title={currentRabbithole?.name}
                  >
                    {currentRabbithole?.name}
                  </Text>
                </Group>
              </Button>
            )}
            {!isDownRabbithole && (
              <Group>
                <Selection
                  name="Scope"
                  icon={<SpyglassIcon size={14} />}
                  onSelect={(v) => {
                    setScope(v as ISpyglassScopeOption);
                  }}
                  initialValue="all"
                  options={[
                    {
                      label: "Everything",
                      value: "all" as ISpyglassScopeOption,
                      icon: <SpyglassIcon size={14} />,
                    },
                    {
                      label: "Ideas",
                      value: "my-qwest" as ISpyglassScopeOption,
                      icon: <LightbulbIcon weight="bold" />,
                    },
                    {
                      label: "Web",
                      value: "web" as ISpyglassScopeOption,
                      icon: <GlobeSimpleIcon weight="bold" />,
                    },
                  ]}
                />
              </Group>
            )}
          </Group>
          <Group justify="end">
            <ActionIcon
              variant="light"
              radius="md"
              color="gray"
              onClick={(e) => {
                e.stopPropagation();
                send();
              }}
            >
              <PaperPlaneRightIcon weight="bold" />
            </ActionIcon>
          </Group>
        </div>
      )}
    </div>
  );
}
