import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  handleCreateNewConnectedIdea,
  handleCreateNewIdea,
} from "../utils/ideas";
import { showNotification } from "@mantine/notifications";
import { getOS } from "../utils/platform";
import { useAuth } from "./AuthContext";
import { userIsSuperuser } from "../utils/user";
import useShortcuts from "../hooks/useShortcuts";
import { useForm } from "@mantine/form";
import useFetch from "../hooks/useFetch";
import {
  CheckIcon,
  FileCode,
  FileCsv,
  FilePdf,
  Icon,
  Image,
  UploadSimple,
} from "@phosphor-icons/react";
import {
  Checkbox,
  Grid,
  Group,
  Text,
  Loader,
  Button,
  Drawer,
  FileInput,
  Code,
  Stack,
  TextInput,
  Space,
} from "@mantine/core";
import { formatFileSize } from "../utils/formatting";
import { useLayout } from "./LayoutContext";
import FeedbackModal from "../components/Utils/Modals/FeedbackModal";
import Spotlight from "../components/UI/Spotlight/Spotlight";
import { useHotkeys } from "@mantine/hooks";
import { handleCreateNewRabbithole } from "../utils/rabbitholes";
import { useLandscape } from "./LandscapeContext";
import useRabbithole from "../hooks/useRabbithole";
import LoadingOverlay from "../components/Display/Loading/LoadingOverlay";
import CreateTaskForm from "../components/Forms/CreateTask";

const { VITE_MAX_USER_NOTES } = import.meta.env;

const max_notes = Number(VITE_MAX_USER_NOTES) || 500;

type IInteractionContext = {
  actions: {
    newIdea: () => void;
    newConnectedIdea: (source: string) => void;
    newRabbithole: () => void;
    newTask: () => void;
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
  };
};

const initialContext: IInteractionContext = {
  actions: {
    newIdea: () => {},
    newConnectedIdea: () => {},
    newRabbithole: () => {},
    newTask: () => {},
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
  const { user, loggedIn } = useAuth();
  const isSuperuser = userIsSuperuser(user);
  const [spotlightOpened, setSpotlightOpened] = useState(false);

  const [uploadingFile, setUploadingFile] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);

  const {
    rabbitholes: {
      entered: { get: currentRabbithole },
    },
  } = useLandscape();

  const { includeThing } = useRabbithole();

  const handleNewIdea = async () => {
    setLoadingSomething(true);
    await handleCreateNewIdea(
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

  const handleNewTask = async () => {
    setCreatingTask(true);
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
      newTask: async () => {
        handleNewTask();
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
        navigate("/graph");
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
      updates: () => {
        navigate("/updates");
      },
      admin: () => {
        navigate("/admin");
      },
      sharedIdeas: () => {
        navigate("/ideas/shared");
      },
    },
    state: {
      spotlightOpened,
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
      "mod+;",
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
      "mod+shift+u",
      () => setUploadingFile(true),
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
      "mod+k", // Explicitly Ctrl+K on all OSes
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
      <UploadFile opened={uploadingFile} setOpened={setUploadingFile} />
      <CreateTask opened={creatingTask} setOpened={setCreatingTask} />
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

type ICreateTaskProps = {
  opened: boolean;
  setOpened: (opened: boolean) => void;
};

function CreateTask({ opened, setOpened }: ICreateTaskProps) {
  const { isMobile } = useLayout();

  return (
    <Drawer
      opened={opened}
      onClose={() => {
        setOpened(false);
      }}
      title={
        <Text>
          <Group gap="xs">
            <CheckIcon weight="bold" />
            Create a task
          </Group>
        </Text>
      }
      offset={14}
      radius="lg"
      position={isMobile ? "bottom" : "right"}
    >
      <Space my="lg" />
      <CreateTaskForm
        onSubmit={() => {
          setOpened(false);
        }}
      />
      <Space my="lg" />
    </Drawer>
  );
}

type IUploadFileProps = {
  opened: boolean;
  setOpened: (opened: boolean) => void;
};

function UploadFile({ opened, setOpened }: IUploadFileProps) {
  const fileForm = useForm<{
    userFile: File | null;
  }>({
    initialValues: {
      userFile: null,
    },
    validate: {
      userFile: (value) => {
        if (!value) return "File is required";
        if (value.size > 1024 * 1024 * 10)
          return "File size should not exceed 10MB";
        return null;
      },
    },
  });

  const userFile = fileForm.values.userFile;

  const [formData, setFormData] = useState<FormData>();
  const { load: uploadFile, loading: loadingUpload } = useFetch<
    FormData,
    undefined
  >({
    url: "/files/",
    method: "POST",
    body: formData,
    dependencies: [formData],
    onSuccess: async () => {
      showNotification({
        title: "File Uploaded",
        message: "File uploaded successfully",
      });
      setFormData(undefined);
      fileForm.reset();
      setOpened(false);
    },
    onError: async (error) => {
      showNotification({
        title: "Upload Error",
        message: "Failed to upload file",
        color: "red",
      });
    },
  });

  const handleUploadFile = async () => {
    try {
      const { errors, hasErrors } = fileForm.validate();
      if (hasErrors) {
        showNotification({
          title: "Validation Error",
          message: errors.userFile,
          color: "red",
        });
      }
      await uploadFile();
    } catch (error) {
      showNotification({
        title: "Upload Error",
        message: "Failed to upload file",
        color: "red",
      });
    }
  };

  useEffect(() => {
    if (!userFile) {
      return;
    }
    const { errors, hasErrors } = fileForm.validate();
    if (!hasErrors) {
      const formData = new FormData();
      formData.append("userFile", userFile);
      setFormData(formData);
    }
    if (hasErrors) {
      showNotification({
        title: "Validation Error",
        message: errors.userFile,
        color: "red",
      });
    }
  }, [userFile]);

  const typeToPreview: (type: string) =>
    | {
        icon: Icon;
      }
    | undefined = (type) => {
    if (type === "application/pdf") {
      return {
        icon: FilePdf,
      };
    }
    if (type.startsWith("image/")) {
      return {
        icon: Image,
      };
    }
    if (type === "application/json") {
      return {
        icon: FileCode,
      };
    }
    if (type === "text/csv") {
      return {
        icon: FileCsv,
      };
    }
    if (type === "application/xml") {
      return {
        icon: FileCode,
      };
    }
    return;
  };

  const preview = userFile ? typeToPreview(userFile.type) : null;

  return (
    <Drawer
      onClose={() => setOpened(false)}
      opened={opened}
      title="Upload a file"
      offset={14}
      radius="lg"
      position="bottom"
      size="70%"
    >
      <Grid>
        <Grid.Col span={{ sm: 12 }}>
          <Text>Start by picking the file you want to upload...</Text>
        </Grid.Col>
        <Grid.Col span={{ sm: 12, md: 6 }}>
          <FileInput
            placeholder="Choose a file"
            {...fileForm.getInputProps("userFile")}
            leftSection={
              <>
                {preview ? (
                  <preview.icon weight="bold" />
                ) : (
                  <UploadSimple weight="bold" />
                )}
              </>
            }
          />
        </Grid.Col>
        {userFile && (
          <Grid.Col span={{ sm: 12 }}>
            <Text>
              You want to upload <Code>{userFile.name}</Code>, which is{" "}
              {formatFileSize(userFile.size)} in size.{" "}
              {fileForm.isValid()
                ? "Is that correct?"
                : "Unfortunately, this file cannot be uploaded."}
            </Text>
          </Grid.Col>
        )}
        {loadingUpload && (
          <Grid.Col span={{ sm: 12 }}>
            <Group>
              <Loader size="sm" />
              <Text>Uploading file...</Text>
            </Group>
          </Grid.Col>
        )}
        {userFile && fileForm.isValid() && (
          <Grid.Col span={{ sm: 12 }}>
            <Group>
              <Button
                color="red"
                variant="light"
                disabled={loadingUpload}
                onClick={() => {
                  fileForm.reset();
                  setOpened(false);
                }}
              >
                No, nevermind.
              </Button>
              <Button
                onClick={() => {
                  handleUploadFile();
                }}
                disabled={loadingUpload}
                leftSection={
                  loadingUpload ? <Loader size="sm" color="white" /> : undefined
                }
              >
                Yes, upload.
              </Button>
            </Group>
          </Grid.Col>
        )}
      </Grid>
    </Drawer>
  );
}
