import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  handleCreateNewConnectedIdea,
  handleCreateNewIdea,
  newIdeaOptimistic,
} from "@domains/knowledge/utils/ideas";
import { showNotification } from "@mantine/notifications";
import { getOS } from "@core/utils/platform";
import { useAuth } from "@domains/identity/contexts/AuthContext";
import { userIsSuperuser } from "@domains/identity/utils/user";
import { ArrowRightIcon, CheckIcon, ShieldCheckIcon } from "@phosphor-icons/react";
import { Text, Drawer, Space, Modal, Button, ThemeIcon, Title } from "@mantine/core";
import { useLayout } from "./LayoutContext";
import FeedbackModal from "@/core/design/components/Modals/FeedbackModal";
import Spotlight from "@domains/discovery/components/Spotlight/Spotlight";
import { useHotkeys } from "@mantine/hooks";
import { handleCreateNewRabbithole } from "@domains/rabbitholes/utils/rabbitholes";
import { useLandscape } from "./LandscapeContext";
import useRabbithole from "@domains/rabbitholes/hooks/useRabbithole";
import LoadingOverlay from "@core/design/components/Loading/LoadingOverlay";
import CreateTaskForm from "@domains/knowledge/components/Forms/CreateTask";
import AddSourceForm from "@domains/knowledge/components/Forms/AddSource";
import PaperDrawer from "@core/design/components/Paper/PaperDrawer";
import { createTask } from "@domains/knowledge/utils/tasks";
import { ISafeIdea } from "../../shared/types/idea";
import { useQueryClient } from "@tanstack/react-query";
import {
  rabbitholeKeys,
  reconcileRabbitholeCaches,
} from "@/domains/rabbitholes/hooks/useRabbitholes";
import policyStyles from "./PolicyHandler.module.scss";

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
    quests: () => void;
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
    quests: () => {},
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

export function InteractionProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [loadingSomething, setLoadingSomething] = useState(false);
  const navigate = useNavigate();
  const { user, loggedIn, acceptPrivacyPolicy, acceptBoth, acceptToS } = useAuth();
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
      .then((realIdea: ISafeIdea) => {
        removeOptimisticIdea(optimisticIdea.id.toString());
        navigate(`idea/${realIdea.id.toString()}`, { replace: true });
        if (currentRabbithole) {
          includeThing(realIdea.id.toString());
        }
      })
      .catch((err: ISafeIdea) => {
        console.error("Error creating idea: ", err);
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
      }
    );
    setLoadingSomething(false);
  };

  const handleNewRabbithole = async () => {
    setLoadingSomething(true);
    await handleCreateNewRabbithole(
      (r) => {
        reconcileRabbitholeCaches(queryClient, r, { addToLists: true });
        queryClient.invalidateQueries({ queryKey: rabbitholeKeys.lists() });
        navigate(`rabbitholes/${r.id.toString()}`);
      },
      (err) => {
        console.error("Error creating new Rabbithole: ", err);
        showNotification({
          title: "Something went wrong",
          message: "Something went wrong adding the rabbithole.",
          color: "red",
        });
      }
    );
    setLoadingSomething(false);
  };

  const handleNewTask = async (description?: string) => {
    const newTask = await createTask({
      auto: false,
      description: description || "New task",
    });
    if (newTask && currentRabbithole) {
      await includeThing(newTask.id.toString());
    }
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
          if ((user && user.totalIdeas < max_notes && max_notes !== -1) || userIsSuperuser(user)) {
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
        if ((user && user.totalIdeas < max_notes && max_notes !== -1) || userIsSuperuser(user)) {
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
      quests: () => {
        navigate("/quests");
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
      <FeedbackModal opened={feedbackModalOpened} onClose={() => setFeedbackModalOpened(false)} />
      <LoadingOverlay loading={false} />

      {spotlightOpened && <Spotlight />}
    </InteractionContext.Provider>
  );
}

export const useInteraction = () => {
  const context = useContext(InteractionContext);
  if (!context) {
    throw new Error("useInteraction must be used within an InteractionProvider");
  }
  return context;
};

function PolicyHandler() {
  const { user, acceptPrivacyPolicy, acceptBoth, acceptToS } = useAuth();
  const [isAccepting, setIsAccepting] = useState(false);

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

  const requiredPolicy = showLegalModal();

  const handleAccept = async () => {
    if (!requiredPolicy || isAccepting) return;

    setIsAccepting(true);
    try {
      if (requiredPolicy === "both") await acceptBoth();
      if (requiredPolicy === "privacy") await acceptPrivacyPolicy();
      if (requiredPolicy === "tos") await acceptToS();
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <Modal
      opened={Boolean(requiredPolicy)}
      onClose={() => {}}
      withCloseButton={false}
      closeOnClickOutside={false}
      closeOnEscape={false}
      centered
      size={520}
      padding={0}
      radius="xl"
      overlayProps={{ backgroundOpacity: 0.72, blur: 10 }}
      classNames={{ content: policyStyles.modal, body: policyStyles.body }}
      aria-labelledby="policy-dialog-title"
    >
      <div className={policyStyles.card}>
        <ThemeIcon className={policyStyles.icon} size={58} radius="xl" variant="light">
          <ShieldCheckIcon size={28} weight="duotone" />
        </ThemeIcon>

        <Title id="policy-dialog-title" order={2} className={policyStyles.title}>
          Before you continue
        </Title>

        <Text className={policyStyles.description} my="md" mx="auto">
          Please review and accept our{" "}
          {(requiredPolicy === "both" || requiredPolicy === "privacy") && (
            <a href="https://www.noeko.app/privacy" target="_blank" rel="noreferrer">
              Privacy Policy
            </a>
          )}
          {requiredPolicy === "both" && " and "}
          {(requiredPolicy === "both" || requiredPolicy === "tos") && (
            <a href="https://www.noeko.app/terms-of-service" target="_blank" rel="noreferrer">
              Terms of Service
            </a>
          )}{" "}
          to keep using Noeko.
        </Text>

        <Button
          className={policyStyles.acceptButton}
          size="md"
          fullWidth
          loading={isAccepting}
          rightSection={!isAccepting && <ArrowRightIcon size={17} weight="bold" />}
          onClick={handleAccept}
        >
          Accept and continue
        </Button>
      </div>
    </Modal>
  );
}

type ICreateTaskProps = {
  opened: boolean;
  setOpened: (opened: boolean) => void;
  initialDescription: string;
};

function CreateTask({ opened, setOpened, initialDescription }: ICreateTaskProps) {
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
