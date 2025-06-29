import {
  Container,
  Title,
  Text,
  SimpleGrid,
  Card,
  Group,
  Stack,
  Loader,
  Alert,
  LoadingOverlay,
  Button,
  Overlay,
  ActionIcon,
  Modal,
  TextInput,
} from "@mantine/core";
import PageWrapper from "../../components/Layout/PageWrapper";
import LeftSidebar from "../../components/UI/Layout/Left";
import RightSidebar from "../../components/UI/Layout/Right";
import useFetch from "../../hooks/useFetch";
import { ITag, ITagForm } from "../../../app/database/models/tag";
import { Link, useNavigate, useParams } from "react-router";
import { IIdea } from "../../../app/database/models/ideas";
import {
  ArrowLeft,
  Tag,
  WarningCircle,
  PencilSimple,
  Trash,
  FloppyDisk,
  X,
  MagnifyingGlassIcon,
} from "@phosphor-icons/react";
import { BlockTag } from "../../components/Tags/TagDisplay";
import {
  CompactIdeaCard,
  StandardIdeaCard,
} from "../../components/Display/Ideas/IdeaCards";
import { addTagToIdea, removeTagFromIdea } from "../../utils/ideas"; // Import new utility functions
import { showNotification } from "@mantine/notifications";
import styles from "./ViewTag.module.scss";
import { useState, useEffect } from "react";
import { useForm } from "@mantine/form";
import Content from "../../components/UI/Layout/Content";
import Search from "../../components/Search/Search";
import { useLayout } from "../../contexts/LayoutContext";
import { useInteraction } from "../../contexts/InteractionContext";

export default function ViewTag() {
  const navigate = useNavigate();
  const { tagId } = useParams<{ tagId: string }>();

  const {
    data: tag,
    loading: loadingTag,
    errors: tagErrors,
    load: reloadTag,
  } = useFetch<undefined, ITag>({
    url: `/tags/${tagId}`,
    runOnMount: true,
  });

  const {
    data: ideas,
    loading: loadingIdeas,
    errors: ideaErrors,
    load: reloadIdeas,
  } = useFetch<undefined, IIdea[]>({
    url: `/tags/${tagId}/ideas`,
    runOnMount: true,
  });

  const {
    data: relatedIdeas,
    loading: loadingRelatedIdeas,
    errors: relatedIdeaErrors,
    load: reloadRelatedIdeas,
  } = useFetch<undefined, IIdea[]>({
    url: `/tags/${tagId}/similar-ideas`,
    runOnMount: true,
  });

  const filteredRelatedIdeas = relatedIdeas
    ? relatedIdeas.filter(
        (relatedIdea) => !ideas?.some((idea) => idea.id === relatedIdea.id),
      )
    : [];

  const somethingLoading = loadingTag || loadingIdeas || loadingRelatedIdeas;

  const handleRefresh = async () => {
    await reloadTag();
    await reloadIdeas();
    await reloadRelatedIdeas();
  };

  const handleAddTag = async (idea: IIdea) => {
    if (!tag) {
      console.error("Cannot add tag: Tag data not loaded.");
      // Optionally show an error message to the user
      return;
    }
    try {
      // Assuming addTagToIdea takes ideaId and tagId (as strings)
      await addTagToIdea(idea.id.toString(), tag.id.toString());
      console.log(`Successfully added tag ${tag.name} to idea ${idea.title}`);
      handleRefresh();
    } catch (error) {
      console.error(
        `Failed to add tag ${tag.name} to idea ${idea.title}:`,
        error,
      );
      // Optionally show an error message to the user
      showNotification({
        title: "Error",
        message: "Something went wrong adding the tag",
        color: "red",
      });
    }
  };

  // Handler for a potential "Remove tag" button (not currently in the TSX)
  const handleRemoveTag = async (idea: IIdea) => {
    if (!tag) {
      console.error("Cannot remove tag: Tag data not loaded.");
      // Optionally show an error message to the user
      return;
    }
    try {
      // Assuming removeTagFromIdea takes ideaId and tagId (as strings)
      await removeTagFromIdea(idea.id.toString(), tag.id.toString());
      console.log(
        `Successfully removed tag ${tag.name} from idea ${idea.title}`,
      );
      handleRefresh();
    } catch (error) {
      console.error(
        `Failed to remove tag ${tag.name} from idea ${idea.title}:`,
        error,
      );
      showNotification({
        title: "Error",
        message: "Something went wrong removing the tag",
        color: "red",
      });
    }
  };

  const ideaIsConnected = (ideaId: string) => {
    return !!ideas?.find((i) => i.id.toString() === ideaId);
  };

  const [draggingOver, setDraggingOver] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);

  const editForm = useForm<Partial<ITagForm>>({
    initialValues: {
      name: "",
      description: "",
    },
    validate: {
      name: (value) => (value?.trim() === "" ? "Tag name is required" : null),
    },
  });

  // Update form values when tag data loads
  useEffect(() => {
    if (tag) {
      editForm.setValues({
        name: tag.name,
        description: tag.description || "",
      });
    }
  }, [tag]);

  const {
    load: updateTag,
    loading: updateTagLoading,
    errors: updateTagErrors,
  } = useFetch<Partial<ITagForm>, ITag>({
    url: `/tags/${tagId}`,
    method: "PUT",
    body: editForm.getTransformedValues(),
    dependencies: [editForm],
    onSuccess: (data) => {
      reloadTag();
      setIsEditing(false);
      showNotification({
        title: "Success",
        message: "Tag updated successfully",
      });
    },
    onError: (error) => {
      console.error("Failed to update tag:", error);
      showNotification({
        title: "Error",
        message: "Failed to update tag",
        color: "red",
      });
    },
  });

  const {
    load: deleteTag,
    loading: deleteTagLoading,
    errors: deleteTagErrors,
  } = useFetch<undefined, undefined>({
    url: `/tags/${tagId}`,
    method: "DELETE",
    onSuccess: () => {
      showNotification({
        title: "Success",
        message: "Tag deleted successfully",
      });
      navigate("/tags"); // Navigate back to tags list
    },
    onError: (error) => {
      console.error("Failed to delete tag:", error);
      showNotification({
        title: "Error",
        message: "Failed to delete tag",
        color: "red",
      });
    },
  });

  const handleConnectionDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    try {
      if (!tag) {
        return;
      }
      const jData = e.dataTransfer.getData("application/json");
      const data = JSON.parse(jData) as { ideaId: string };
      const { ideaId } = data;
      if (ideaIsConnected(ideaId)) {
        showNotification({
          title: "Can't connect again",
          message: "Can't connect this idea again.",
          color: "yellow",
        });
        return;
      }
      console.log("Dropped connection id: ", ideaId);
      await addTagToIdea(ideaId, tag.id.toString());
      handleRefresh();
    } catch (error) {
      console.log("Error creating connection: ", error);
    } finally {
      setDraggingOver(false);
    }
  };

  const handleSave = async () => {
    const validationResult = editForm.validate();
    if (validationResult.hasErrors) {
      return;
    }

    const currentValues = editForm.getTransformedValues();
    const valuesToUpdate: Partial<ITagForm> = {};

    // Only include changed values
    if (currentValues.name !== tag?.name) {
      valuesToUpdate.name = currentValues.name;
    }
    if (currentValues.description !== (tag?.description || "")) {
      valuesToUpdate.description = currentValues.description;
    }

    if (Object.keys(valuesToUpdate).length > 0) {
      await updateTag();
    } else {
      setIsEditing(false); // No changes, just exit edit mode
    }
  };

  const handleCancel = () => {
    if (tag) {
      editForm.setValues({
        name: tag.name,
        description: tag.description || "",
      });
    }
    setIsEditing(false);
  };

  const openDeleteModal = () => setDeleteModalOpened(true);
  const closeDeleteModal = () => setDeleteModalOpened(false);

  const handleDeleteConfirm = async () => {
    await deleteTag();
  };

  const {
    elements: {
      rightSidebar: {
        mode: { set: setRightSidebar },
      },
    },
  } = useLayout();

  return (
    <PageWrapper>
      <Modal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        title={`Delete Tag: "${tag?.name}"`}
        centered
      >
        <Text size="sm">
          Are you sure you want to delete this tag? This action cannot be undone
          and will remove the tag from all associated ideas.
        </Text>
        {deleteTagErrors.length > 0 && (
          <Text c="red" size="xs" mt="sm">
            Failed to delete tag: {deleteTagErrors.join(", ")}
          </Text>
        )}
        <Group mt="lg" justify="flex-end">
          <Button variant="default" onClick={closeDeleteModal}>
            Cancel
          </Button>
          <Button
            color="red"
            onClick={handleDeleteConfirm}
            loading={deleteTagLoading}
          >
            Delete Tag
          </Button>
        </Group>
      </Modal>
      <LeftSidebar>
        <LeftSidebar.Open>
          {!!tag && (
            <Stack gap="md">
              <Group>
                <Title order={3}>Suggested Ideas</Title>
                {loadingRelatedIdeas && <Loader size="md" />}
              </Group>
              {relatedIdeaErrors && relatedIdeaErrors.length > 0 && (
                <Alert
                  icon={<WarningCircle size={24} />} // Updated icon
                  title="Error!"
                  color="red"
                  mt="md"
                >
                  Failed to load suggested ideas: {relatedIdeaErrors.join(", ")}
                </Alert>
              )}
              {!(relatedIdeaErrors && relatedIdeaErrors.length > 0) &&
              filteredRelatedIdeas &&
              filteredRelatedIdeas.length > 0 ? (
                <Stack gap="md">
                  {filteredRelatedIdeas.map((idea) => (
                    <StandardIdeaCard
                      onCardClick={() => {
                        navigate(`/idea/${idea.id.toString()}`);
                      }}
                      idea={idea}
                      key={idea.id.toString()}
                      actions={[
                        {
                          icon: <Tag />,
                          id: "apply_tag",
                          label: `Apply "${tag.name}"`,
                          onClick: () => {
                            handleAddTag(idea);
                          },
                          tooltip: `Apply tag ${tag.name} to ${idea.title}`,
                        },
                      ]}
                    />
                  ))}
                </Stack>
              ) : (
                !loadingRelatedIdeas &&
                !(relatedIdeaErrors && relatedIdeaErrors.length > 0) && (
                  <Text c="dimmed">No similar ideas found for this tag.</Text>
                )
              )}
            </Stack>
          )}
        </LeftSidebar.Open>
      </LeftSidebar>
      <Content>
        {draggingOver && (
          <Overlay
            backgroundOpacity={0}
            blur={4}
            onDragOver={(e) => {
              e.preventDefault();
            }}
            onDrop={(e) => {
              handleConnectionDrop(e);
            }}
            radius={"lg"}
          >
            <Group align="center" justify="center" style={{ height: "100%" }}>
              <Text c="white" mx="lg" size="sm">
                Drop here to create a connection
              </Text>
            </Group>
          </Overlay>
        )}
        {!!tag && (
          <Stack gap="xl">
            <Group>
              <Link to="/tags">
                <Button variant="subtle" leftSection={<ArrowLeft />}>
                  All Tags
                </Button>
              </Link>
            </Group>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              {isEditing ? (
                <Stack gap="md">
                  <Group justify="space-between">
                    <Title order={4}>Edit Tag</Title>
                    <Group gap="xs">
                      <ActionIcon
                        variant="filled"
                        onClick={handleSave}
                        loading={updateTagLoading}
                        title="Save Tag"
                      >
                        <FloppyDisk weight="bold" />
                      </ActionIcon>
                      <ActionIcon
                        variant="outline"
                        color="gray"
                        onClick={handleCancel}
                        title="Cancel Edit"
                      >
                        <X weight="bold" />
                      </ActionIcon>
                    </Group>
                  </Group>
                  <TextInput
                    label="Tag Name"
                    placeholder="Tag name"
                    {...editForm.getInputProps("name")}
                    required
                  />
                  <TextInput
                    label="Description"
                    placeholder="Tag description (optional)"
                    {...editForm.getInputProps("description")}
                  />
                  {updateTagErrors.length > 0 && (
                    <Text c="red" size="sm">
                      {updateTagErrors.join(", ")}
                    </Text>
                  )}
                </Stack>
              ) : (
                <Stack gap="md">
                  <Group justify="space-between" align="flex-start">
                    <Stack gap="xs" style={{ flex: 1 }}>
                      <Group gap="lg">
                        <BlockTag tag={tag} color="blue" />
                      </Group>
                      {tag.description && (
                        <Text size="sm" c="dimmed">
                          {tag.description}
                        </Text>
                      )}
                      <Group gap="md">
                        <Text size="xs" c="dimmed">
                          Created:{" "}
                          {new Date(tag.createdAt).toLocaleDateString()}
                        </Text>
                        {tag.updatedAt && tag.updatedAt !== tag.createdAt && (
                          <Text size="xs" c="dimmed">
                            Last Updated:{" "}
                            {new Date(tag.updatedAt).toLocaleDateString()}
                          </Text>
                        )}
                      </Group>
                    </Stack>
                    <Group gap="xs">
                      <ActionIcon
                        variant="subtle"
                        onClick={() => setIsEditing(true)}
                        title="Edit Tag"
                      >
                        <PencilSimple />
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        onClick={openDeleteModal}
                        title="Delete Tag"
                      >
                        <Trash />
                      </ActionIcon>
                    </Group>
                  </Group>
                </Stack>
              )}
            </Card>

            {/* Ideas with this Tag */}
            <Stack gap="md">
              <Group>
                <Title order={3}>Ideas with this tag</Title>
                {loadingIdeas && <Loader size="md" />}
              </Group>
              {ideaErrors && ideaErrors.length > 0 && (
                <Alert
                  icon={<WarningCircle size={24} />} // Updated icon
                  title="Error!"
                  color="red"
                  mt="md"
                >
                  Failed to load ideas for this tag: {ideaErrors.join(", ")}
                </Alert>
              )}
              {ideas && ideas.length > 0 ? (
                <SimpleGrid cols={2} spacing="lg">
                  {ideas.map((idea) => (
                    <CompactIdeaCard
                      idea={idea}
                      key={idea.id.toString()}
                      onCardClick={() => {
                        navigate(`/idea/${idea.id.toString()}`);
                      }}
                      actions={[
                        {
                          icon: <Tag />,
                          id: "remove_tag",
                          label: `Remove tag`,
                          onClick: () => {
                            handleRemoveTag(idea);
                          },
                          tooltip: `Remove tag ${tag.name} from ${idea.title}`,
                        },
                      ]}
                    />
                  ))}
                </SimpleGrid>
              ) : (
                !loadingIdeas &&
                !(ideaErrors && ideaErrors.length > 0) && (
                  <Text c="dimmed">
                    No ideas are currently associated with this tag.
                  </Text>
                )
              )}
            </Stack>
          </Stack>
        )}
      </Content>
      <RightSidebar>
        <RightSidebar.Collapsed>
          <ActionIcon
            onClick={() => {
              setRightSidebar("open");
            }}
            variant="subtle"
            size="sm"
          >
            <MagnifyingGlassIcon size={16} />
          </ActionIcon>
        </RightSidebar.Collapsed>
        <RightSidebar.Open>
          <Search />
        </RightSidebar.Open>
      </RightSidebar>
    </PageWrapper>
  );
}
