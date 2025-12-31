import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  handleCreateNewConnectedIdea,
  handleCreateNewIdea,
  newIdeaOptimistic,
} from "../utils/ideas";
import { showNotification } from "@mantine/notifications";
import { getOS } from "../utils/platform";
import { useAuth } from "./AuthContext";
import { userIsSuperuser } from "../utils/user";
import { CheckIcon } from "@phosphor-icons/react";
import {
  Group,
  Text,
  Drawer,
  Space,
  Modal,
  Stack,
  Button,
} from "@mantine/core";
import { useLayout } from "./LayoutContext";
import FeedbackModal from "../components/Utils/Modals/FeedbackModal";
import Spotlight from "../components/UI/Spotlight/Spotlight";
import { useHotkeys } from "@mantine/hooks";
import { handleCreateNewRabbithole } from "../utils/rabbitholes";
import { useLandscape } from "./LandscapeContext";
import useRabbithole from "../hooks/useRabbithole";
import LoadingOverlay from "../components/Display/Loading/LoadingOverlay";
import CreateTaskForm from "../components/Forms/CreateTask";
import AddSourceForm from "../components/Forms/AddSource";
import PaperDrawer from "../components/Display/Paper/PaperDrawer";
import { createTask } from "../utils/tasks";

const { VITE_MAX_USER_NOTES } = import.meta.env;

const max_notes = Number(VITE_MAX_USER_NOTES) || 500;

type IInteractionContext = {
  actions: {
    newIdea: () => void;
    newConnectedIdea: (source: string) => void;
    newRabbithole: () => void;
    newTask: (description?: string) => void;
    newSource: () => void;
    layout: {
      leftSidebar: {
        open: () => void;
        close: () => void;
        toggle: () => void;
      };
      rightSidebar: {
        open: () => void;
        close: () => void;
        toggle: () => void;
      };
      spotlight: {
        open: () => void;
        close: () => void;
        toggle: () => void;
      };
    };
    feedback: {
      openFeedbackModal: () => void;
    };
  };
  views: {
    dashboard: () => void;
    graph: () => void;
    spyglass: () => void;
    ideas: () => void;
    sources: () => void;
    rabbitholes: () => void;
    settings: () => void;
    profile: () => void;
    tags: () => void;
    tasks: () => void;
    updates: () => void;
    admin: () => void;
    sharedIdeas: () => void;
  };
  state: {
    spotlightOpened: boolean;
    zen: {
      get: boolean;
      set: (isZen: boolean) => void;
    };
  };
};

const initialContext: IInteractionContext = {
  actions: {
    newIdea: () => {},
    newConnectedIdea: () => {},
    newRabbithole: () => {},
    newTask: () => {},
    newSource: () => {},
    layout: {
      leftSidebar: {
        open: () => {},
        close: () => {},
        toggle: () => {},
      },
      rightSidebar: {
        open: () => {},
        close: () => {},
        toggle: () => {},
      },
      spotlight: {
        open: () => {},
        close: () => {},
        toggle: () => {},
      },
    },
    feedback: {
      openFeedbackModal: () => {},
    },
  },
  views: {
    dashboard: () => {},
    graph: () => {},
    spyglass: () => {},
    sources: () => {},
    ideas: () => {},
    rabbitholes: () => {},
    settings: () => {},
    profile: () => {},
    tags: () => {},
    tasks: () => {},
    updates: () => {},
    admin: () => {},
    sharedIdeas: () => {},
  },
  state: {
    spotlightOpened: false,
    zen: {
      get: false,
      set: () => {},
    },
  },
};

const InteractionContext = createContext(initialContext);

export function InteractionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loadingSomething, setLoadingSomething] = useState(false);
  const navigate = useNavigate();
  const { user, loggedIn, acceptPrivacyPolicy, acceptBoth, acceptToS } =
    useAuth();
  const isSuperuser = userIsSuperuser(user);
  const [spotlightOpened, setSpotlightOpened] = useState(false);

  const [uploadingSource, setUploadingSource] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [initialTaskDescription, setInitialTaskDescription] = useState("");
  const [isZenMode, setIsZenMode] = useState(false);

  const {
    rabbitholes: {
      entered: { get: currentRabbithole },
    },
    ideas: {
      optimistic: { add: addOptimisticIdea, remove: removeOptimisticIdea },
    },
  } = useLandscape();

  const { includeThing } = useRabbithole();

  const handleNewIdea = () => {
    setLoadingSomething(true);
    const { optimisticIdea, promise } = newIdeaOptimistic();
    addOptimisticIdea(optimisticIdea);
    navigate(`idea/${optimisticIdea.id.toString()}`);

    promise
      .then((realIdea) => {
        removeOptimisticIdea(optimisticIdea.id.toString());
        navigate(`idea/${realIdea.id.toString()}`, { replace: true });
        if (currentRabbithole) {
          includeThing(realIdea.id.toString());
        }
      })
      .catch((err) => {
        removeOptimisticIdea(optimisticIdea.id.toString());
        navigate("/");
        showNotification({
          title: "Something went wrong",
          message: "Something went wrong adding the idea.",
          color: "red",
        });
      })
      .finally(() => {
        setLoadingSomething(false);
      });
  };

  const handleNewConnectedIdea = async (source: string) => {
    setLoadingSomething(true);
    await handleCreateNewConnectedIdea(
      source,
      (i) => {
        navigate(`idea/${i.id.toString()}`);
        if (currentRabbithole) {
          includeThing(i.id.toString());
        }
      },
      (err) => {
        showNotification({
          title: "Something went wrong",
          message: "Something went wrong adding the idea.",
          color: "red",
        });
      },
    );
    setLoadingSomething(false);
  };

  const handleNewRabbithole = async () => {
    setLoadingSomething(true);
    await handleCreateNewRabbithole(
      (r) => {
        navigate(`rabbitholes/${r.id.toString()}`);
      },
      (err) => {
        showNotification({
          title: "Something went wrong",
          message: "Something went wrong adding the rabbithole.",
          color: "red",
        });
      },
    );
    setLoadingSomething(false);
  };

  const handleNewTask = async (description?: string) => {
    const newTask = await createTask({
      auto: false,
      description: description || "New task",
    });
    navigate(`/task/${newTask?.id}`);
  };

  const handleNewSource = async () => {
    setUploadingSource(true);
  };

  const os = getOS();
  const ctrl = os !== "macos";
  const meta = os === "macos";

  const {
    elements: {
      leftSidebar: {
        mode: { toggle: toggleLeftSidebar, set: setLeftSidebar },
      },
      rightSidebar: {
        mode: { toggle: toggleRightSidebar, set: setRightSidebarMode },
      },
    },
  } = useLayout();

  const [feedbackModalOpened, setFeedbackModalOpened] = useState(false);

  const value: IInteractionContext = {
    actions: {
      newIdea: async () => {
        try {
          setLoadingSomething(true);
          if (
            (user && user.totalIdeas < max_notes && max_notes !== -1) ||
            userIsSuperuser(user)
          ) {
            handleNewIdea();
          } else {
            showNotification({
              title: "Too many notes",
              message: `You have reached your limit of ${max_notes} ideas!`,
              color: "red",
            });
          }
        } catch (error) {
          console.error("Error creating new idea:", error);
        } finally {
          setLoadingSomething(false);
        }
      },
      newConnectedIdea: async (source: string) => {
        if (
          (user && user.totalIdeas < max_notes && max_notes !== -1) ||
          userIsSuperuser(user)
        ) {
          handleNewConnectedIdea(source);
        } else {
          showNotification({
            title: "Too many notes",
            message: `You have reached your limit of ${max_notes} ideas!`,
            color: "red",
          });
        }
      },
      newRabbithole: async () => {
        handleNewRabbithole();
      },
      newTask: async (description?: string) => {
        handleNewTask(description);
      },
      newSource: async () => {
        handleNewSource();
      },
      layout: {
        leftSidebar: {
          open: () => {
            setLeftSidebar("open");
          },
          close: () => {
            setLeftSidebar("collapsed");
          },
          toggle: () => {
            toggleLeftSidebar();
          },
        },
        rightSidebar: {
          open: () => {
            setRightSidebarMode("open");
          },
          close: () => {
            setRightSidebarMode("collapsed");
          },
          toggle: () => {
            toggleRightSidebar();
          },
        },
        spotlight: {
          open: () => {
            setSpotlightOpened(true);
          },
          close: () => {
            setSpotlightOpened(false);
          },
          toggle: () => {
            setSpotlightOpened(!spotlightOpened);
          },
        },
      },
      feedback: {
        openFeedbackModal: () => {
          setFeedbackModalOpened(true);
        },
      },
    },
    views: {
      dashboard: () => {
        navigate("/");
      },
      graph: () => {
        navigate("/constellation");
      },
      spyglass: () => {
        navigate("/spyglass");
      },
      settings: () => {
        navigate("/settings");
      },
      profile: () => {
        navigate("/settings/profile");
      },
      ideas: () => {
        navigate("/ideas");
      },
      rabbitholes: () => {
        navigate("/rabbitholes");
      },
      tags: () => {
        navigate("/tags");
      },
      tasks: () => {
        navigate("/tasks");
      },
      sources: () => {
        navigate("/sources");
      },
      updates: () => {
        navigate("/updates");
      },
      admin: () => {
        navigate("/admin");
      },
      sharedIdeas: () => {
        navigate("/sharing");
      },
    },
    state: {
      spotlightOpened,
      zen: {
        get: isZenMode,
        set: setIsZenMode,
      },
    },
  };

  useHotkeys([
    [
      "mod+shift+h",
      value.views.dashboard,
      {
        preventDefault: true,
      },
    ],
    [
      "mod+shift+g",
      value.views.graph,
      {
        preventDefault: true,
      },
    ],
    [
      "mod+shift+/",
      value.views.spyglass,
      {
        preventDefault: true,
      },
    ],
    [
      "mod+shift+b",
      value.views.ideas,
      {
        preventDefault: true,
      },
    ],
    [
      "mod+.",
      () => navigate("/settings"),
      {
        preventDefault: true,
      },
    ],
    [
      'mod+"',
      () => {
        if (isSuperuser) {
          value.views.admin();
        }
      },
      {
        preventDefault: true,
      },
    ],
    [
      "mod+;",
      () => {
        navigate("/keymap");
      },
      {
        preventDefault: true,
      },
    ],
    [
      "mod+shift+u",
      () => setUploadingSource(true),
      {
        preventDefault: true,
      },
    ],
    [
      "mod+shift+i",
      value.actions.newIdea,
      {
        preventDefault: true,
      },
    ],
    [
      "mod+k",
      (event) => {
        event.preventDefault();
        setSpotlightOpened((o) => !o);
      },
      {
        preventDefault: true,
      },
    ],
  ]);

  if (!loggedIn) {
    return <>{children}</>;
  }

  return (
    <InteractionContext.Provider value={value}>
      {children}
      <PolicyHandler />
      <AddSource opened={uploadingSource} setOpened={setUploadingSource} />
      <CreateTask
        opened={creatingTask}
        setOpened={setCreatingTask}
        initialDescription={initialTaskDescription}
      />
      <FeedbackModal
        opened={feedbackModalOpened}
        onClose={() => setFeedbackModalOpened(false)}
      />
      <LoadingOverlay loading={false} />

      {spotlightOpened && <Spotlight />}
    </InteractionContext.Provider>
  );
}

export const useInteraction = () => {
  const context = useContext(InteractionContext);
  if (!context) {
    throw new Error(
      "useInteraction must be used within an InteractionProvider",
    );
  }
  return context;
};

function PolicyHandler() {
  const { user, loggedIn, acceptPrivacyPolicy, acceptBoth, acceptToS } =
    useAuth();

  const showLegalModal = (): "privacy" | "tos" | "both" | undefined => {
    if (!user?.acceptedPrivacyPolicyAt && !user?.acceptedTermsOfServiceAt) {
      return "both";
    }
    if (!user?.acceptedPrivacyPolicyAt) {
      return "privacy";
    }
    if (!user?.acceptedTermsOfServiceAt) {
      return "tos";
    }
  };

  return (
    <>
      <Drawer
        opened={showLegalModal() === "both"}
        withCloseButton={false}
        onClose={() => {}}
        size="80%"
        position="top"
        offset="24px"
        radius="md"
      >
        <Stack gap="md" align="center" justify="center">
          <Text size="sm" c="dimmed">
            Please accept our{" "}
            <a href="https://www.noeko.app/privacy">Privacy Policy</a> and{" "}
            <a href="https://www.noeko.app/terms-of-service">
              Terms of Service
            </a>{" "}
            to continue using Noeko :)
          </Text>
          <Group gap="sm">
            <Button
              variant="light"
              color="blue"
              onClick={() => {
                acceptBoth();
              }}
            >
              Accept
            </Button>
          </Group>
        </Stack>
      </Drawer>

      <Drawer
        opened={showLegalModal() === "privacy"}
        withCloseButton={false}
        onClose={() => {}}
        size="80%"
        position="top"
        offset="24px"
        radius="md"
      >
        <Stack gap="md" align="center" justify="center">
          <Text size="sm" c="dimmed">
            Please accept our{" "}
            <a href="https://www.noeko.app/privacy">Privacy Policy</a> to
            continue using Noeko :)
          </Text>
          <Group gap="sm">
            <Button
              variant="light"
              color="blue"
              onClick={() => {
                acceptPrivacyPolicy();
              }}
            >
              Accept
            </Button>
          </Group>
        </Stack>
      </Drawer>

      <Drawer
        opened={showLegalModal() === "tos"}
        withCloseButton={false}
        onClose={() => {}}
        size="80%"
        position="top"
        offset="24px"
        radius="md"
      >
        <Stack gap="md" align="center" justify="center">
          <Text size="sm" c="dimmed">
            Please accept our{" "}
            <a href="https://www.noeko.app/terms">Terms of Service</a> to
            continue using Noeko :)
          </Text>
          <Group gap="sm">
            <Button
              variant="light"
              color="blue"
              onClick={() => {
                acceptToS();
              }}
            >
              Accept
            </Button>
          </Group>
        </Stack>
      </Drawer>
    </>
  );
}

type ICreateTaskProps = {
  opened: boolean;
  setOpened: (opened: boolean) => void;
  initialDescription: string;
};

function CreateTask({
  opened,
  setOpened,
  initialDescription,
}: ICreateTaskProps) {
  const { isMobile } = useLayout();

  return (
    <PaperDrawer
      opened={opened}
      onClose={() => {
        setOpened(false);
      }}
      title={"Create a task"}
    >
      <Space my="lg" />
      <CreateTaskForm
        onSubmit={() => {
          setOpened(false);
        }}
        initialDescription={initialDescription}
      />
      <Space my="lg" />
    </PaperDrawer>
  );
}

type IAddSourceProps = {
  opened: boolean;
  setOpened: (opened: boolean) => void;
};

function AddSource({ opened, setOpened }: IAddSourceProps) {
  const navigate = useNavigate();

  return (
    <Drawer
      onClose={() => setOpened(false)}
      opened={opened}
      title="Add a Source"
      offset={14}
      radius="lg"
      position="bottom"
      size="70%"
    >
      <AddSourceForm
        onSubmit={(source) => {
          setOpened(false);
          navigate(`/source/${source.id.toString()}`);
        }}
        onCancel={() => {
          setOpened(false);
        }}
      />
    </Drawer>
  );
}
