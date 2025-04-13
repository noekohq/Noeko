import React, { useEffect, useState, useCallback } from "react"; // Import React
import { useNavigate, useParams } from "react-router";
import styles from "./Idea.module.scss";
import useFetch from "../../hooks/useFetch"; // Your custom hook
import { IIdea, IIdeaForm } from "../../../app/database/models/ideas";
import {
  ActionIcon,
  Button,
  Grid,
  Group,
  Title,
  Loader,
  Text,
  Card,
  Space,
  Tooltip,
  Kbd,
  Box,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import {
  ArrowLeft,
  FloppyDisk, // Save icon
  ListMagnifyingGlass,
  Shapes,
  Sparkle,
  TrashSimple,
  TreeStructure,
} from "@phosphor-icons/react";
import { showNotification } from "@mantine/notifications";
import { useDisclosure } from "@mantine/hooks";
import Connections from "./Connections";
import Overview from "./Overview";
import DreamWriter from "../../components/Content/DreamWriter/DreamWriter";

export default function Idea() {
  const { ideaId } = useParams<{ ideaId: string }>();
  const navigate = useNavigate();

  // State for the fetched idea data
  const [idea, setIdea] = useState<IIdea | null>(null);
  // State to store the original fetched data for comparison
  const [originalIdea, setOriginalIdea] = useState<IIdea | null>(null);

  // State for editable fields
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");

  // State to track unsaved changes
  const [isSaved, setIsSaved] = useState<boolean>(true);

  // --- Fetching the Idea ---
  // Uses the hook's returned data/error state, handled by useEffect below
  const {
    data: fetchedIdeaData, // Hook's state for fetched data
    load: reloadIdea, // Function to re-trigger the fetch
    loading: loadingIdea, // Loading state from the hook
    errors: loadErrors, // Changed from 'error' to 'errors' based on hook source
  } = useFetch<undefined, IIdea>({
    url: `/graph/ideas/${ideaId}`,
    query: {
      withRelatedIdeas: "true",
      withConnections: "true",
      withDerived: "true",
    },
    method: "GET",
    runOnMount: true, // Let the hook handle running on mount
    // onSuccess/onError are handled internally by the hook updating its state (data, errors)
    // We'll use useEffect to react to changes in 'fetchedIdeaData' and 'loadErrors'
  });

  // Effect to update component state when idea data is successfully fetched/reloaded
  useEffect(() => {
    if (fetchedIdeaData) {
      setIdea(fetchedIdeaData);
      setOriginalIdea(fetchedIdeaData); // Store the original state
      setTitle(fetchedIdeaData.title);
      setContent(fetchedIdeaData.content || "");
      setIsSaved(true); // Reset save state on successful load/reload
    }
  }, [fetchedIdeaData]); // Run when the hook's data state changes

  // Effect to handle loading errors from the hook
  useEffect(() => {
    // Check if errors array has content
    if (loadErrors && loadErrors.length > 0) {
      showNotification({
        title: "Error Loading Idea",
        // Display the first error message, or a default
        message: `Could not fetch idea details: ${loadErrors[0] || "Unknown error"}`,
        color: "red",
      });
      // Optionally navigate away if the idea can't be loaded
      // navigate("/");
    }
    // Add navigate to dependency array if used inside
  }, [loadErrors /*, navigate*/]); // Run when the hook's errors state changes

  // --- Update Title State ---
  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
  }, []);

  // --- Update Content State ---
  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
  }, []);

  // --- Track Unsaved Changes ---
  useEffect(() => {
    if (!originalIdea) return; // Don't compare until original data is loaded

    const titleChanged = title !== originalIdea.title;
    const contentChanged = content !== (originalIdea.content || "");

    setIsSaved(!(titleChanged || contentChanged));
  }, [title, content, originalIdea]);

  // --- Saving Changes (Combined Title & Content) ---
  // Using the hook as per your example and source code
  const {
    load: triggerSaveChanges, // Function to trigger the save PUT request
    loading: loadingSaveChanges, // Loading state for the save request
  } = useFetch<Partial<IIdeaForm>, IIdea>({
    url: `/graph/ideas/${ideaId}`,
    method: "PUT",
    body: {
      // Body defined upfront using current state values
      title: title,
      content: content,
    },
    dependencies: [title, content], // Dependencies listed as per example
    onSuccess: (updatedIdea) => {
      // onSuccess defined in config
      // We need to reload to ensure all data (especially derived) is fresh
      reloadIdea();
      // The useEffect watching 'fetchedIdeaData' will handle updating state & isSaved
      showNotification({
        title: "Success",
        message: "Idea updated successfully",
      });
    },
    onError: (error: any) => {
      // onError defined in config
      showNotification({
        title: "Error Saving",
        // Attempt to get a meaningful message from the error object
        message: `There was an error updating the idea: ${error?.response?.data?.message || error?.message || "Unknown error"}`,
        color: "red",
      });
    },
    // No runOnMount or runOnDependencies needed for manual trigger
  });

  // Handler for the save button, calls the hook's load function
  const handleSaveChanges = useCallback(() => {
    // Prevent saving if already saved, currently saving, or no idea loaded
    if (isSaved || loadingSaveChanges || !idea) return;
    triggerSaveChanges(); // Execute the PUT request defined in the hook
  }, [isSaved, loadingSaveChanges, idea, triggerSaveChanges]);

  // --- Deleting the Idea ---
  const { load: triggerDeleteIdea, loading: loadingDelete } = useFetch({
    // No specific types needed if body/response are simple/ignored
    url: `/graph/ideas/${ideaId}`,
    method: "DELETE",
    // No body or dependencies typically needed
    onSuccess: () => {
      navigate("/"); // Navigate away after successful deletion
      showNotification({
        title: "Success",
        message: "Idea deleted successfully",
      });
    },
    onError: (error: any) => {
      showNotification({
        title: "Error Deleting",
        message: `There was an error deleting the idea: ${error?.response?.data?.message || error?.message || "Unknown error"}`,
        color: "red",
      });
    },
  });

  // Modal confirmation for delete
  const handleDeleteIdea = useCallback(() => {
    if (loadingDelete) return;
    modals.openConfirmModal({
      title: "Are you sure you want to delete this idea?",
      centered: true, // Optional: center modal
      children: (
        <Text size="sm">
          This action cannot be undone. All associated data will be lost.
        </Text>
      ),
      labels: { confirm: "Delete Idea", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: () => triggerDeleteIdea(), // Call hook's load on confirm
    });
  }, [loadingDelete, triggerDeleteIdea]);

  // --- Embeddings ---
  const { load: triggerEmbedIdea, loading: loadingEmbeddings } = useFetch({
    // Assuming simple POST with no complex body/response needed here
    url: `/graph/ideas/${ideaId}/embed`,
    method: "POST",
    // No body or dependencies needed if endpoint takes ID from URL only
    onSuccess: () => {
      // Reload idea data to get updated embedding status/timestamps
      reloadIdea();
      showNotification({
        title: "Embeddings",
        message: "Embedding generation process started.", // Message suggests async process
      });
    },
    onError: (error: any) => {
      showNotification({
        title: "Embedding Error",
        message: `Failed to start embedding generation: ${error?.response?.data?.message || error?.message || "Unknown error"}`,
        color: "red",
      });
    },
  });

  // Handler to trigger embedding
  const handleEmbedIdea = useCallback(() => {
    // Prevent triggering if already loading, saving, or no idea
    if (loadingEmbeddings || loadingSaveChanges || !idea) return;
    // Optional: Prevent embedding if there are unsaved changes
    if (!isSaved) {
      showNotification({
        title: "Unsaved Changes",
        message: "Please save your changes before generating embeddings.",
        color: "yellow",
      });
      return;
    }
    triggerEmbedIdea(); // Call the hook's load function
  }, [isSaved, loadingEmbeddings, loadingSaveChanges, idea, triggerEmbedIdea]);

  // Helper function to check embedding status
  const embeddingsOutOfDate = useCallback(() => {
    if (!idea) return false;
    if (!idea.embeddingsUpdatedAt) return true; // Needs embedding for the first time
    // Compare content update time with embedding update time
    return new Date(idea.contentUpdatedAt) > new Date(idea.embeddingsUpdatedAt);
  }, [idea]);

  // --- Status Text ---
  const statusText = useCallback(() => {
    let text = "";
    if (loadingEmbeddings) {
      text += "Generating embeddings... ";
    } else if (!idea?.embeddings || idea.embeddings?.length === 0) {
      text += "No embeddings generated yet. ";
    } else if (embeddingsOutOfDate()) {
      text += "Embeddings might be out of date. ";
    }
    return text.trim();
  }, [idea, loadingEmbeddings, embeddingsOutOfDate]);

  const showStatusBlock = statusText().length > 0 || loadingEmbeddings;
  const showEmbedButton = embeddingsOutOfDate();

  // --- Drawers ---
  const [connectionDrawerOpened, connectionDrawerHandlers] =
    useDisclosure(false);
  const [overviewDrawerOpened, overviewDrawerHandlers] = useDisclosure(false);

  // Close drawers on initial mount or when idea changes
  useEffect(() => {
    connectionDrawerHandlers.close();
    overviewDrawerHandlers.close();
  }, [ideaId]); // Add handlers to deps

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Target inputs, textareas, or contentEditable elements
      const targetElement = event.target as HTMLElement;
      const isEditing =
        targetElement.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(targetElement.tagName);

      // Allow shortcuts if Cmd/Ctrl is pressed, even while editing for common actions like save
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case "i":
            event.preventDefault();
            connectionDrawerHandlers.toggle();
            break;
          case "o":
            event.preventDefault();
            overviewDrawerHandlers.toggle();
            break;
          case "s":
            event.preventDefault();
            handleSaveChanges(); // Allow save even when editing
            break;
          // Add other shortcuts if needed
        }
      }
      // Add non-Cmd/Ctrl shortcuts here, potentially checking !isEditing
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
    // Add handlers to dependency array
  }, [connectionDrawerHandlers, overviewDrawerHandlers, handleSaveChanges]);

  if (loadingIdea && !idea) {
    return (
      <Loader
        size="md"
        style={{ display: "block", margin: "auto", marginTop: "2rem" }}
      />
    );
  }

  if (!idea && !loadingIdea && loadErrors.length > 0) {
    return (
      <Text c="red" ta="center" mt="lg">
        Failed to load idea. It might not exist or there was a network error.
      </Text>
    );
  }

  // Safety check if somehow idea is still null after loading checks
  if (!idea) {
    // This state might indicate an issue or a brief moment before navigation
    return (
      <Text ta="center" mt="lg">
        Idea not available.
      </Text>
    );
  }

  // Main component render
  return (
    <div className={styles.idea}>
      <Connections
        opened={connectionDrawerOpened}
        onClose={connectionDrawerHandlers.close}
        loadingIdea={loadingIdea}
        idea={idea}
        reloadIdea={reloadIdea}
      />
      <Overview
        opened={overviewDrawerOpened}
        onClose={overviewDrawerHandlers.close}
        loadingIdea={loadingIdea}
        idea={idea}
        reloadIdea={reloadIdea}
      />

      {/* Main Content Grid */}
      <Grid>
        {/* Action Buttons */}
        <Grid.Col span={{ base: 12 }}>
          <Group gap="sm">
            <Tooltip label="Back to List">
              <ActionIcon
                onClick={() => navigate("/")}
                variant="default"
                size="lg"
                aria-label="Back to list"
              >
                <ArrowLeft size={18} />
              </ActionIcon>
            </Tooltip>

            {/* Save Button */}
            <Tooltip
              label={isSaved ? "No changes to save" : "Save changes (Ctrl+S)"}
            >
              <Box>
                {" "}
                {/* Wrap for tooltip when disabled */}
                <Button
                  leftSection={
                    loadingSaveChanges ? (
                      <Loader size="xs" color="white" />
                    ) : (
                      <FloppyDisk size={18} />
                    )
                  }
                  onClick={handleSaveChanges}
                  disabled={isSaved || loadingSaveChanges}
                  variant="filled"
                  size="sm" // Consistent size
                >
                  Save
                </Button>
              </Box>
            </Tooltip>

            {/* Visual Separator */}
            <Box
              style={{
                borderLeft: "1px solid var(--mantine-color-gray-3)",
                height: "24px",
                alignSelf: "center",
              }}
              mx="xs"
            />

            <Tooltip label="Connections (Ctrl+I)">
              <ActionIcon
                onClick={connectionDrawerHandlers.toggle}
                variant="light"
                size="lg"
                aria-label="Open connections"
              >
                <TreeStructure size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Overview (Ctrl+O)">
              <ActionIcon
                onClick={overviewDrawerHandlers.toggle}
                variant="light"
                size="lg"
                aria-label="Open overview"
              >
                <ListMagnifyingGlass size={18} />
              </ActionIcon>
            </Tooltip>

            {/* Visual Separator */}
            <Box
              style={{
                borderLeft: "1px solid var(--mantine-color-gray-3)",
                height: "24px",
                alignSelf: "center",
              }}
              mx="xs"
            />

            <Tooltip label="Delete Idea">
              <ActionIcon
                variant="light"
                color="red"
                size="lg"
                onClick={handleDeleteIdea}
                disabled={loadingDelete}
                aria-label="Delete idea"
              >
                {loadingDelete ? (
                  <Loader size="xs" />
                ) : (
                  <TrashSimple size={18} />
                )}
              </ActionIcon>
            </Tooltip>
          </Group>
        </Grid.Col>

        {/* Spacing */}
        <Grid.Col span={{ base: 12 }}>
          <Space h="lg" />
        </Grid.Col>

        {/* Title */}
        <Grid.Col span={{ base: 12 }}>
          {/* Using Mantine Title, making it look editable */}
          <Title
            order={1}
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => handleTitleChange(e.currentTarget.innerText)}
            dangerouslySetInnerHTML={{ __html: title || "" }}
            className={styles.editableTitle} // Add custom style for focus/blur
          />
          {!isSaved && title !== originalIdea?.title && (
            <Text size="xs" c="orange.7" mt={4}>
              Title has unsaved changes.
            </Text>
          )}
        </Grid.Col>

        {/* Content Summary Card */}
        <Grid.Col span={{ base: 12 }}>
          <Card radius="md" withBorder shadow="xs" p="md">
            <Text fw={500} c="dimmed" size="sm" mb={4}>
              <Sparkle
                weight="bold"
                style={{
                  verticalAlign: "middle",
                  marginRight: "6px",
                  fontSize: "1.1em",
                }}
              />
              Content Summary
            </Text>
            <Text size="sm" lineClamp={3}>
              {" "}
              {/* Limit lines for potentially long summaries */}
              {idea.derived?.generative_summary?.sentenceSummary || (
                <Text span c="dimmed" fs="italic">
                  No summary available.
                </Text>
              )}
            </Text>
          </Card>
        </Grid.Col>

        {/* Status Block (Embeddings, etc.) */}
        {showStatusBlock && (
          <Grid.Col span={{ base: 12 }}>
            <Card p="lg" radius="md" withBorder shadow="xs">
              <Group justify="space-between" align="center">
                <Text size="sm" c="dimmed">
                  {statusText()}
                </Text>
                {showEmbedButton && (
                  <Button
                    leftSection={
                      loadingEmbeddings ? (
                        <Loader size="sm" />
                      ) : (
                        <Shapes weight="bold" size={16} />
                      )
                    }
                    disabled={
                      loadingEmbeddings || loadingSaveChanges || !isSaved
                    }
                    onClick={handleEmbedIdea}
                    variant="light"
                    size="xs" // Smaller button for this context
                  >
                    Generate Embeddings
                  </Button>
                )}
              </Group>
            </Card>
          </Grid.Col>
        )}

        {/* Editor */}
        {!isSaved && content !== (originalIdea?.content || "") && (
          <Grid.Col span={{ sm: 12 }}>
            <Text size="xs" c="orange.7" mt={4}>
              Content has unsaved changes.
            </Text>
          </Grid.Col>
        )}
        <Grid.Col span={{ base: 12 }}>
          <Space h="md" />
          <DreamWriter
            key={ideaId}
            initialContent={idea.content || ""}
            stickyMenu={true}
            onChange={handleContentChange}
          />
        </Grid.Col>
      </Grid>
    </div>
  );
}

// Add corresponding CSS in Idea.module.scss for .editableTitle if needed:
/*
.editableTitle {
  border: 1px solid transparent;
  padding: 2px 4px;
  border-radius: var(--mantine-radius-sm);
  outline: none;
  transition: border-color 0.2s ease;

  &:focus {
    border-color: var(--mantine-color-blue-5); // Or your focus color
  }
}
*/
