import { useForm } from "@mantine/form";
import useShortcuts from "../../hooks/useShortcuts";
import { useNavigate } from "react-router";
import { IIdea } from "../../../app/database/models/ideas";
import useFetch from "../../hooks/useFetch";
import { showNotification } from "@mantine/notifications";
import { useEffect, useState } from "react";
import { validateIdeaContent } from "../../utils/data";
import {
  Checkbox,
  Grid,
  Group,
  Modal,
  Text,
  TextInput,
  Title,
  Loader,
  Button,
} from "@mantine/core";
import DreamWriter from "../Content/DreamWriter/DreamWriter";
import { ExclamationMark } from "@phosphor-icons/react";
import { getOS } from "../../utils/platform";

export default function TopLevelUI() {
  const navigate = useNavigate();
  const [addingIdea, setAddingIdea] = useState(false);
  const os = getOS();
  const ctrl = os !== "macos";
  const meta = os === "macos";

  useShortcuts({
    shortcuts: [
      {
        keys: { ctrl, meta, shift: true, key: "h" },
        run: () => navigate("/"),
      },
      {
        keys: { ctrl, meta, shift: true, key: "g" },
        run: () => navigate("/graph"),
      },
      {
        keys: { ctrl, meta, shift: true, key: "i" },
        run: () => setAddingIdea(true),
      },
    ],
  });

  return (
    <>
      <AddIdea opened={addingIdea} setOpened={setAddingIdea} />
    </>
  );
}

type AddIdeaProps = {
  opened: boolean;
  setOpened: (opened: boolean) => void;
};

function AddIdea({ opened, setOpened }: AddIdeaProps) {
  const navigate = useNavigate();
  const form = useForm({
    initialValues: {
      title: "",
      content: "",
      generateTitle:
        typeof window !== "undefined" // Check if window exists (for SSR/build)
          ? window.localStorage.getItem("should-autogen-title") === "true"
          : false,
    },
    validate: {
      title: (value, fields) => {
        if (fields.generateTitle) {
          return null;
        }
        if (value.length < 2 && !fields.generateTitle) {
          return "Title must be at least 2 characters long";
        }
        return null;
      },
      content: (value) =>
        value.length < 2 ? "Content must be at least 2 characters long" : null,
    },
  });

  const { load: addIdea, loading: loadingAddIdea } = useFetch<
    { title?: string; content: string; generateTitle: boolean }, // Adjusted body type
    IIdea
  >({
    url: "/graph/ideas",
    method: "POST",
    body: {
      ...(form.values.generateTitle ? {} : { title: form.values.title }),
      content: form.values.content,
      generateTitle: form.values.generateTitle,
    },
    dependencies: [form.values],
    onSuccess: (data) => {
      showNotification({
        title: "Idea added successfully",
        message: `Your idea "${data.title || "Generated Title"}" has been added.`,
      });
      form.reset();
      setOpened(false);
      navigate(`/idea/${data.id.toString()}`);
    },
    onError: (error) => {
      console.error("Failed to add idea:", error);
      showNotification({
        title: "Error Adding Idea",
        message: "An unexpected error occurred. Please try again.",
        color: "red",
      });
    },
    onFinally: () => {
      // onFinally can be used for cleanup regardless of success/error
      // If you only want reloadGraph on success, keep it in onSuccess
    },
  });

  const [contentError, setContentError] = useState<string>();
  useEffect(() => {
    const { isValid, errors: contentErrors } = validateIdeaContent(
      form.values.content,
    );
    if (!isValid) {
      setContentError(contentErrors[0]);
      showNotification({
        title: "Content Error",
        message: contentErrors[0],
        color: "red",
      });
      return;
    } else if (isValid) {
      setContentError(undefined);
    }
  }, [form.values.content]);

  const handleSubmit = async () => {
    const { hasErrors, errors } = form.validate();
    if (hasErrors) {
      showNotification({
        title: "Validation Error",
        message: Object.values(errors)[0] || "Please check the form fields.",
        color: "red",
      });
      return;
    }
    const { isValid, errors: contentErrors } = validateIdeaContent(
      form.values.content,
    );
    if (!isValid) {
      setContentError(contentErrors[0]);
      showNotification({
        title: "Content Error",
        message: contentError,
        color: "red",
      });
      return;
    } else if (isValid) {
      setContentError(undefined);
    }
    try {
      await addIdea();
      // Resetting and closing are now handled in onSuccess
    } catch (error) {
      console.error("Failed to add idea:", error);
      showNotification({
        title: "Error Adding Idea",
        message: "An unexpected error occurred. Please try again.",
        color: "red",
      });
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        "should-autogen-title",
        String(form.values.generateTitle),
      );
    }
  }, [form.values.generateTitle]);

  return (
    <Modal
      opened={opened}
      onClose={() => setOpened(false)}
      title="Add an idea"
      radius="lg"
      size="100%"
    >
      <Grid gutter="xl">
        <Grid.Col span={{ sm: 12 }}>
          <Grid>
            <Grid.Col span={{ sm: 12 }}>
              {!form.values.generateTitle && (
                <TextInput
                  label="Title"
                  placeholder="Enter title"
                  {...form.getInputProps("title")}
                />
              )}
            </Grid.Col>
            <Grid.Col span={{ sm: 12 }}>
              <Checkbox
                label="Entitle for me"
                description="Just write your content, we'll write the title"
                {...form.getInputProps("generateTitle", {
                  type: "checkbox",
                })}
              />
            </Grid.Col>
            <Grid.Col span={{ sm: 12 }}>
              <Group>
                {/* <Button
                      onClick={handleCheckClipboard}
                      loading={isCheckingClipboard}
                      variant="light"
                      size="xs"
                    >
                      Check Clipboard for Content
                    </Button> */}
              </Group>
            </Grid.Col>
          </Grid>
        </Grid.Col>

        <Grid.Col span={{ sm: 12 }}>
          <Title order={3}>Content</Title>
          <DreamWriter
            initialContent={""}
            stickyMenu={false}
            onChange={(content) => {
              form.setFieldValue("content", content);
            }}
          />
          {form.errors.content && (
            <Text c="red" size="xs" mt={4}>
              {form.errors.content}
            </Text>
          )}
        </Grid.Col>
        <Grid.Col span={{ sm: 12 }} />
        {loadingAddIdea && (
          <Grid.Col span={{ sm: 12 }}>
            <Group>
              <Loader size="sm" />
              <Text>Creating idea... This may take a short while.</Text>
            </Group>
          </Grid.Col>
        )}
        {contentError && (
          <Grid.Col span={{ sm: 12 }}>
            <Group c="red">
              <ExclamationMark />
              <Text>{contentError}</Text>
            </Group>
          </Grid.Col>
        )}
        <Grid.Col span={{ sm: 12 }}>
          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => setOpened(false)}
              disabled={loadingAddIdea}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit} // Simplified onClick
              leftSection={
                loadingAddIdea ? <Loader size="sm" color="white" /> : undefined
              }
              disabled={loadingAddIdea || !!contentError}
            >
              Add
            </Button>
          </Group>
        </Grid.Col>
      </Grid>
    </Modal>
  );
}
