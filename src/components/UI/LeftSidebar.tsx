import { useEffect, useState } from "react";
import styles from "./Sidebars.module.scss";
import {
  ActionIcon,
  Button,
  Checkbox,
  Divider,
  Flex,
  Grid,
  Group,
  Modal,
  Text,
  Textarea,
  TextInput,
  Tooltip,
} from "@mantine/core";
import {
  ArrowLineDown,
  ArrowLineLeft,
  ArrowLineRight,
  ArrowLineUp,
  HouseSimple,
  MegaphoneSimple,
} from "@phosphor-icons/react";
import useShortcuts from "../../hooks/useShortcuts";
import { getCurrentTimeOfDay } from "../../utils/datetime";
import { useAuth } from "../../contexts/AuthContext";
import { Link, useLocation } from "react-router";
import { useMediaQuery } from "@mantine/hooks";
import { useLayout } from "../../contexts/LayoutContext";
import useFetch from "../../hooks/useFetch";
import {
  IFeedback,
  IFeedbackForm,
} from "../../../app/database/models/feedback";
import { useForm } from "@mantine/form";
import { showNotification } from "@mantine/notifications";

type LeftSidebarProps = {
  children?: React.ReactNode | React.ReactNode[];
  stayCollapsed?: boolean;
};

export default function LeftSidebar({
  children,
  stayCollapsed,
}: LeftSidebarProps) {
  const { user } = useAuth();
  const openable = children !== undefined && !stayCollapsed;

  const [opened, setOpened] = useState(() => {
    if (!openable) return false;
    if (typeof window !== "undefined" && window.localStorage) {
      const storedValue = localStorage.getItem("leftSidebarOpened");
      return storedValue !== "false";
    }
    return true;
  });

  useEffect(() => {
    if (!openable) {
      setOpened(false);
    }
  }, [stayCollapsed]);

  const {
    leftSidebar: { setOpened: setLeftSidebarOpened },
  } = useLayout();

  useEffect(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem("leftSidebarOpened", opened.toString());
    }
    setLeftSidebarOpened(opened);
  }, [opened]);

  const handleToggle = () => {
    if (!openable) return;
    setOpened((currentOpened) => !currentOpened);
  };

  useShortcuts({
    shortcuts: [
      {
        keys: { ctrl: true, key: "q" },
        run: () => handleToggle(),
      },
    ],
  });

  const location = useLocation();

  const isHome = location.pathname === "/";

  const isMobile = useMediaQuery("(max-width: 768px)");

  // if mobile, use up arrow, if desktop, use left arrow
  const ToggleIconClosed = isMobile ? ArrowLineDown : ArrowLineRight;
  const ToggleIconOpened = isMobile ? ArrowLineUp : ArrowLineLeft;

  const feedbackForm = useForm({
    initialValues: {
      content: "",
      consentToContact: true,
    },
    validate: {
      content: (v) => {
        if (!v) {
          return "Content cannot be empty.";
        }
        return null;
      },
    },
  });

  const [addingFeedback, setAddingFeedback] = useState(false);

  const { load: createFeedback, loading: loadingFeedback } = useFetch<
    Omit<IFeedbackForm, "status">,
    IFeedback
  >({
    url: "/feedback",
    method: "POST",
    body: {
      ...feedbackForm.values,
    },
    dependencies: [feedbackForm.values],
    onSuccess: () => {
      showNotification({
        title: "Success",
        message: "Thank you for your valuable feedback!",
      });
      feedbackForm.reset();
      setAddingFeedback(false);
    },
    onError: () => {
      showNotification({
        title: "Error",
        message: "Something went wrong creating your feedback",
        color: "red",
      });
    },
  });

  const handleSubmitFeedback = () => {
    const { hasErrors, errors } = feedbackForm.validate();
    if (hasErrors) {
      showNotification({
        title: "Error with form",
        message: Object.values(errors)[0],
        color: "red",
      });
      return;
    }
    createFeedback();
  };

  return (
    <div
      className={`${styles.leftSidebar} ${opened ? styles.opened : styles.closed}`}
    >
      <Modal
        opened={addingFeedback}
        onClose={() => {
          setAddingFeedback(false);
        }}
        title="Submit feedback"
      >
        <Grid>
          <Grid.Col span={{ sm: 12 }}>
            <Textarea
              label="Your Feedback"
              placeholder="Your feedback here..."
              {...feedbackForm.getInputProps("content")}
            />
          </Grid.Col>
          <Grid.Col span={{ sm: 12 }}>
            <Checkbox
              label="Can we contact you about this?"
              description={`We have your email as ${user?.email}`}
              {...feedbackForm.getInputProps("consentToContact", {
                type: "checkbox",
              })}
            />
          </Grid.Col>
          <Grid.Col span={{ sm: 12 }}>
            <Group justify="end">
              <Button
                variant="default"
                onClick={() => {
                  feedbackForm.reset();
                }}
              >
                Nevermind.
              </Button>
              <Button
                onClick={() => {
                  handleSubmitFeedback();
                }}
              >
                Submit!
              </Button>
            </Group>
          </Grid.Col>
        </Grid>
      </Modal>
      <Flex
        direction={isMobile ? (opened ? "column" : "row") : "column"}
        justify="flex-start"
        align={isMobile ? "" : opened ? "flex-start" : "center"}
        gap="md"
      >
        <Flex
          justify="space-between"
          align={isMobile ? (opened ? "center" : "flex-end") : "center"}
          direction={
            isMobile ? (opened ? "column" : "row") : opened ? "row" : "column"
          }
          gap="md"
          w="100%"
        >
          {opened && (
            <Text size="sm">
              Good {getCurrentTimeOfDay()},{" "}
              {user?.firstName ?? user?.email ?? "Guest"}
            </Text>
          )}
          <Flex
            direction={
              isMobile
                ? opened
                  ? "row-reverse"
                  : "row-reverse"
                : opened
                  ? "row-reverse"
                  : "column"
            }
            gap="md"
          >
            {openable && (
              <Tooltip label="Toggle Sidebar (ctrl + q)">
                <ActionIcon
                  onClick={handleToggle}
                  variant="subtle"
                  aria-label={opened ? "Collapse sidebar" : "Expand sidebar"}
                >
                  {opened ? (
                    <ToggleIconOpened weight="bold" />
                  ) : (
                    <ToggleIconClosed weight="bold" />
                  )}
                </ActionIcon>
              </Tooltip>
            )}
            {!isHome && (
              <Link to="/">
                <Tooltip label="Go home (cmd/ctrl + H)">
                  <ActionIcon variant="subtle">
                    <HouseSimple weight="bold" />
                  </ActionIcon>
                </Tooltip>
              </Link>
            )}
          </Flex>
        </Flex>
        {opened ? (
          <Tooltip label="Give us feedback!">
            <Button
              variant="light"
              size="sm"
              leftSection={<MegaphoneSimple weight="bold" />}
              onClick={() => {
                setAddingFeedback(true);
              }}
            >
              I have feedback!
            </Button>
          </Tooltip>
        ) : (
          <Tooltip label="Give us feedback!">
            <ActionIcon
              variant="light"
              size="md"
              onClick={() => {
                setAddingFeedback(true);
              }}
            >
              <MegaphoneSimple />
            </ActionIcon>
          </Tooltip>
        )}
      </Flex>
      {opened && <Divider my="md" />}
      {opened && <div className={styles.content}>{children}</div>}
    </div>
  );
}
